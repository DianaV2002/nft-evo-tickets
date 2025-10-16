import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { NftEvoTickets } from '../../../target/types/nft_evo_tickets';
import * as fs from 'fs';
import { getDatabase } from '../database/db';
import { addActivity } from './levelService';

export class BlockchainScanner {
  private program: anchor.Program<NftEvoTickets>;
  private connection: Connection;
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor(
    private cluster: 'devnet' | 'mainnet-beta' = 'devnet',
    private programId: string,
    private rpcUrl?: string
  ) {}

  /**
   * Initialize scanner with Solana program
   */
  async initialize(): Promise<void> {
    this.connection = new Connection(
      this.rpcUrl || anchor.web3.clusterApiUrl(this.cluster),
      'confirmed'
    );

    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });

    // Try multiple IDL paths for production vs development
    const idlPaths = [
      './backend/level-system/idl/nft_evo_tickets.json', // Production path
      './idl/nft_evo_tickets.json', // Relative to backend/level-system/
      '../idl/nft_evo_tickets.json',
      './target/idl/nft_evo_tickets.json', // Development path
      '../target/idl/nft_evo_tickets.json',
      '../../target/idl/nft_evo_tickets.json',
    ];

    let idl = null;
    for (const path of idlPaths) {
      try {
        if (fs.existsSync(path)) {
          idl = JSON.parse(fs.readFileSync(path, 'utf-8'));
          console.log(`Found IDL at: ${path}`);
          break;
        }
      } catch (err) {
        // Continue to next path
      }
    }

    if (!idl) {
      console.warn('⚠️  IDL file not found. Scanner will run in limited mode (RPC-based scanning only).');
      console.warn('   To enable full scanning, ensure target/idl/nft_evo_tickets.json is included in deployment.');
      // Initialize connection only, program scanning will be limited
      return;
    }

    this.program = new anchor.Program(idl, provider) as anchor.Program<NftEvoTickets>;

    console.log('Blockchain scanner initialized');
    console.log('Cluster:', this.cluster);
    console.log('Program ID:', this.programId);
  }

  /**
   * Get last scanned signature from database
   */
  private getLastScannedSignature(): string | null {
    const db = getDatabase();
    const state = db.prepare('SELECT last_scanned_signature FROM scanner_state WHERE id = 1').get() as any;
    return state?.last_scanned_signature || null;
  }

  /**
   * Update last scanned signature in database
   */
  private updateLastScannedSignature(signature: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE scanner_state
      SET last_scanned_signature = ?,
          last_scan_time = CURRENT_TIMESTAMP,
          scan_count = scan_count + 1
      WHERE id = 1
    `).run(signature);
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scan for new activities on the blockchain
   */
  async scanActivities(): Promise<void> {
    if (!this.program) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    try {
      console.log('[Scanner] Starting scan...');

      // Get recent transactions for the program with retry logic
      let signatures;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          signatures = await this.connection.getSignaturesForAddress(
            new PublicKey(this.programId),
            { limit: 20 }, // Reduced from 50 to minimize RPC calls
            'confirmed'
          );
          break; // Success, exit retry loop
        } catch (error: any) {
          if (error.message?.includes('429') && retries < maxRetries - 1) {
            retries++;
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            console.log(`[Scanner] Rate limited, retrying in ${delay}ms... (attempt ${retries}/${maxRetries})`);
            await this.sleep(delay);
          } else {
            throw error; // Re-throw if not rate limit or max retries reached
          }
        }
      }

      if (signatures.length === 0) {
        console.log('[Scanner] No new transactions found');
        return;
      }

      const lastScanned = this.getLastScannedSignature();
      let newTransactions = signatures;

      // Filter to only new transactions
      if (lastScanned) {
        const lastIndex = signatures.findIndex(sig => sig.signature === lastScanned);

        if (lastIndex === 0) {
          // Last scanned is the most recent - no new transactions
          console.log('[Scanner] No new transactions since last scan');
          return;
        } else if (lastIndex > 0) {
          // Found in the list - process only transactions before it
          newTransactions = signatures.slice(0, lastIndex);
          console.log(`[Scanner] Filtering: Found last scanned at index ${lastIndex}, processing ${newTransactions.length} new transactions`);
        } else if (lastIndex === -1) {
          // Last scanned not found in recent transactions
          // This means all current signatures are newer, OR we scanned too long ago
          // Process all but warn that we might be re-processing
          console.log('[Scanner] Warning: Last scanned signature not found in recent transactions. Processing all.');
        }
      } else {
        console.log('[Scanner] First scan - processing all recent transactions');
      }

      console.log(`[Scanner] Found ${newTransactions.length} new transactions to process`);

      // Process transactions in reverse order (oldest first)
      for (let i = 0; i < newTransactions.reverse().length; i++) {
        const sigInfo = newTransactions[i];
        try {
          await this.processTransaction(sigInfo.signature);

          // Add small delay between transactions to avoid rate limiting
          if (i < newTransactions.length - 1) {
            await this.sleep(500); // 500ms delay between transactions
          }
        } catch (error: any) {
          // Skip duplicate transactions silently (this is expected)
          if (error?.message?.includes('Transaction already processed')) {
            // Silent skip - this is normal when re-scanning old transactions
            continue;
          }
          console.error(`[Scanner] Error processing transaction ${sigInfo.signature}:`, error);
        }
      }

      // Update last scanned signature
      if (newTransactions.length > 0) {
        this.updateLastScannedSignature(signatures[0].signature);
      }

      console.log('[Scanner] Scan completed');
    } catch (error) {
      console.error('[Scanner] Error during scan:', error);
    }
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(signature: string): Promise<void> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || tx.meta.err) {
        return; // Skip failed transactions
      }

      // Parse transaction logs to identify instruction type
      const logs = tx.meta.logMessages || [];

      // Check for specific instruction patterns in logs
      for (const log of logs) {
        // Ticket Minted
        if (log.includes('Instruction: MintTicket')) {
          await this.handleTicketMinted(tx, signature);
        }
        // Ticket Purchased
        else if (log.includes('Instruction: BuyTicket')) {
          await this.handleTicketPurchased(tx, signature);
        }
        // Ticket Scanned
        else if (log.includes('Instruction: UpdateTicket') && log.includes('scanned')) {
          await this.handleTicketScanned(tx, signature);
        }
        // Ticket Upgraded to Collectible
        else if (log.includes('Instruction: UpgradeToCollectible')) {
          await this.handleTicketUpgraded(tx, signature);
        }
        // Event Created
        else if (log.includes('Instruction: CreateEvent')) {
          await this.handleEventCreated(tx, signature);
        }
      }
    } catch (error) {
      console.error(`Error processing transaction ${signature}:`, error);
    }
  }

  /**
   * Handle ticket minted event
   */
  private async handleTicketMinted(tx: any, signature: string): Promise<void> {
    try {
      const owner = tx.transaction.message.accountKeys.find((key: any) => key.signer)?.pubkey.toString();

      if (owner) {
        const result = addActivity(owner, 'TICKET_MINTED', signature, {
          event: 'ticket_minted',
        });

        if (result.success) {
          console.log(`[Scanner] Ticket minted by ${owner.slice(0, 8)}... (+${result.pointsEarned} pts)`);
        }
      }
    } catch (error) {
      console.error('Error handling ticket minted:', error);
    }
  }

  /**
   * Handle ticket purchased event
   */
  private async handleTicketPurchased(tx: any, signature: string): Promise<void> {
    try {
      const buyer = tx.transaction.message.accountKeys.find((key: any) => key.signer)?.pubkey.toString();

      if (buyer) {
        const result = addActivity(buyer, 'TICKET_PURCHASED', signature, {
          event: 'ticket_purchased',
        });

        if (result.success) {
          console.log(`[Scanner] Ticket purchased by ${buyer.slice(0, 8)}... (+${result.pointsEarned} pts)`);
        }
      }
    } catch (error) {
      console.error('Error handling ticket purchased:', error);
    }
  }

  /**
   * Handle ticket scanned event
   */
  private async handleTicketScanned(tx: any, signature: string): Promise<void> {
    try {
      // The ticket owner receives points for attendance
      const accounts = tx.transaction.message.accountKeys;

      // Find the ticket account and fetch its owner
      // This is a simplified version - you may need to parse the instruction data
      const signer = accounts.find((key: any) => key.signer)?.pubkey.toString();

      if (signer) {
        const result = addActivity(signer, 'TICKET_SCANNED', signature, {
          event: 'ticket_scanned',
        });

        if (result.success) {
          console.log(`[Scanner] Ticket scanned for ${signer.slice(0, 8)}... (+${result.pointsEarned} pts)`);
        }
      }
    } catch (error) {
      console.error('Error handling ticket scanned:', error);
    }
  }

  /**
   * Handle ticket upgraded to collectible event
   */
  private async handleTicketUpgraded(tx: any, signature: string): Promise<void> {
    try {
      const owner = tx.transaction.message.accountKeys.find((key: any) => key.signer)?.pubkey.toString();

      if (owner) {
        const result = addActivity(owner, 'TICKET_COLLECTIBLE', signature, {
          event: 'ticket_collectible',
        });

        if (result.success) {
          console.log(`[Scanner] Ticket upgraded by ${owner.slice(0, 8)}... (+${result.pointsEarned} pts)`);
        }
      }
    } catch (error) {
      console.error('Error handling ticket upgraded:', error);
    }
  }

  /**
   * Handle event created
   */
  private async handleEventCreated(tx: any, signature: string): Promise<void> {
    try {
      const organizer = tx.transaction.message.accountKeys.find((key: any) => key.signer)?.pubkey.toString();

      if (organizer) {
        const result = addActivity(organizer, 'EVENT_CREATED', signature, {
          event: 'event_created',
        });

        if (result.success) {
          console.log(`[Scanner] Event created by ${organizer.slice(0, 8)}... (+${result.pointsEarned} pts)`);
        }
      }
    } catch (error) {
      console.error('Error handling event created:', error);
    }
  }

  /**
   * Start periodic scanning
   */
  startPeriodicScan(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Scanner already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting periodic scan every ${intervalMinutes} minutes...`);

    // Run immediately
    this.scanActivities();

    // Then run periodically
    this.scanInterval = setInterval(() => {
      this.scanActivities();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic scanning
   */
  stopPeriodicScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isRunning = false;
    console.log('Periodic scan stopped');
  }
}
