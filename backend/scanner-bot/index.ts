import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { NftEvoTickets } from '../../app/src/nft_evo_tickets.json';
import { TicketStage } from '../../programs/nft-evo-tickets/src/state';

export interface ScannerBotConfig {
  rpcUrl: string;
  scannerWallet: string; // Base58 private key
  programId: string;
  eventPda: string;
  authorityPda: string;
  updateInterval: number; // milliseconds
  retryAttempts: number;
}

export class ScannerBot {
  private connection: Connection;
  private program: Program<NftEvoTickets>;
  private scannerKeypair: Keypair;
  private config: ScannerBotConfig;
  private isRunning: boolean = false;
  private updateQueue: TicketUpdate[] = [];

  constructor(config: ScannerBotConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.scannerKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(config.scannerWallet))
    );
    
    const provider = new AnchorProvider(
      this.connection,
      { publicKey: this.scannerKeypair.publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs } as any,
      { commitment: 'confirmed' }
    );
    
    this.program = new Program(NftEvoTickets as any, provider);
  }

  async start(): Promise<void> {
    console.log('Starting Scanner Bot...');
    this.isRunning = true;
    
    // Start processing queue
    this.processUpdateQueue();
    
    // Start periodic health check
    this.startHealthCheck();
    
    console.log('Scanner Bot started successfully');
  }

  async stop(): Promise<void> {
    console.log('Stopping Scanner Bot...');
    this.isRunning = false;
  }

  // Add ticket to update queue
  async queueTicketUpdate(ticketMint: PublicKey, newStage: TicketStage, metadataUri?: string): Promise<void> {
    const update: TicketUpdate = {
      ticketMint,
      newStage,
      metadataUri,
      timestamp: Date.now(),
      attempts: 0
    };
    
    this.updateQueue.push(update);
    console.log(`Queued ticket update: ${ticketMint.toString()} -> ${TicketStage[newStage]}`);
  }

  // Process update queue
  private async processUpdateQueue(): Promise<void> {
    while (this.isRunning) {
      if (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift();
        if (update) {
          await this.processTicketUpdate(update);
        }
      }
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Process individual ticket update
  private async processTicketUpdate(update: TicketUpdate): Promise<void> {
    try {
      update.attempts++;
      console.log(`Processing ticket update (attempt ${update.attempts}): ${update.ticketMint.toString()}`);

      // Get ticket account
      const [ticketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft-evo-tickets'),
          Buffer.from('ticket'),
          this.config.eventPda,
          update.ticketMint.toBuffer()
        ],
        new PublicKey(this.config.programId)
      );

      // Create transaction
      const transaction = new Transaction();

      if (update.metadataUri) {
        // Update ticket metadata
        const updateMetadataIx = await this.program.methods
          .updateTicketMetadata(update.newStage, update.metadataUri)
          .accounts({
            signer: this.scannerKeypair.publicKey,
            eventAccount: new PublicKey(this.config.eventPda),
            ticketAccount: ticketPda,
            ticketMint: update.ticketMint,
            metadataAccount: this.getMetadataPda(update.ticketMint),
            authority: new PublicKey(this.config.authorityPda),
            scanner: this.scannerKeypair.publicKey,
            tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
          })
          .instruction();

        transaction.add(updateMetadataIx);
      } else {
        // Update ticket stage only
        const updateStageIx = await this.program.methods
          .updateTicket(update.newStage)
          .accounts({
            signer: this.scannerKeypair.publicKey,
            eventAccount: new PublicKey(this.config.eventPda),
            ticketAccount: ticketPda,
            authority: new PublicKey(this.config.authorityPda),
            scanner: this.scannerKeypair.publicKey
          })
          .instruction();

        transaction.add(updateStageIx);
      }

      // Send transaction
      const signature = await this.program.provider.sendAndConfirm(transaction);
      console.log(`Ticket update successful: ${signature}`);

    } catch (error) {
      console.error(`Ticket update failed (attempt ${update.attempts}):`, error);
      
      if (update.attempts < this.config.retryAttempts) {
        // Re-queue for retry
        this.updateQueue.push(update);
        console.log(`Re-queuing ticket update for retry`);
      } else {
        console.error(`Ticket update failed permanently: ${update.ticketMint.toString()}`);
      }
    }
  }

  // Health check
  private async startHealthCheck(): Promise<void> {
    setInterval(async () => {
      try {
        const balance = await this.connection.getBalance(this.scannerKeypair.publicKey);
        console.log(`Scanner Bot health check - Balance: ${balance / 1e9} SOL`);
        
        if (balance < 0.01) { // Less than 0.01 SOL
          console.warn('Scanner Bot low balance!');
        }
      } catch (error) {
        console.error('Scanner Bot health check failed:', error);
      }
    }, this.config.updateInterval);
  }

  // Get metadata PDA
  private getMetadataPda(mint: PublicKey): PublicKey {
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        mint.toBuffer()
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    );
    return metadataPda;
  }

  // Batch update multiple tickets
  async batchUpdateTickets(updates: TicketUpdate[]): Promise<void> {
    console.log(`Batch updating ${updates.length} tickets`);
    
    for (const update of updates) {
      await this.queueTicketUpdate(update.ticketMint, update.newStage, update.metadataUri);
    }
  }

  // Get queue status
  getQueueStatus(): { pending: number; processing: number } {
    return {
      pending: this.updateQueue.length,
      processing: 0 // Could track active updates
    };
  }
}

interface TicketUpdate {
  ticketMint: PublicKey;
  newStage: TicketStage;
  metadataUri?: string;
  timestamp: number;
  attempts: number;
}

// Scanner Bot Factory
export function createScannerBot(config: ScannerBotConfig): ScannerBot {
  return new ScannerBot(config);
}

// Usage example
export async function startScannerBot(): Promise<void> {
  const config: ScannerBotConfig = {
    rpcUrl: process.env.RPC_URL || 'https://api.devnet.solana.com',
    scannerWallet: process.env.SCANNER_WALLET || '',
    programId: process.env.PROGRAM_ID || 'G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr',
    eventPda: process.env.EVENT_PDA || '',
    authorityPda: process.env.AUTHORITY_PDA || '',
    updateInterval: 5000, // 5 seconds
    retryAttempts: 3
  };

  const bot = createScannerBot(config);
  await bot.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down Scanner Bot...');
    await bot.stop();
    process.exit(0);
  });
}

// Export for use in other modules
export { TicketUpdate };
