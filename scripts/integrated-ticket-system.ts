import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { NftEvoTickets } from '../app/src/nft_evo_tickets.json';
import { TicketStage } from '../programs/nft-evo-tickets/src/state';

// Import our new modules
import { BatchTicketMinter, createBatchMinter } from './batch-mint-tickets';
import { ScannerBot, createScannerBot, ScannerBotConfig } from '../backend/scanner-bot/index';
import { RPCOptimizer, createRPCOptimizer, RPCConfig } from '../backend/rpc-optimizer/index';
import { OfflineFallback, createOfflineFallback } from '../backend/offline-fallback/index';

export interface IntegratedTicketSystemConfig {
  // RPC Configuration
  rpc: RPCConfig;
  
  // Scanner Bot Configuration
  scanner: ScannerBotConfig;
  
  // Batch Minting Configuration
  batchMinting: {
    ticketCount: number;
    batchSize: number;
    retryAttempts: number;
    delayBetweenBatches: number;
  };
  
  // Offline Configuration
  offline: {
    maxCacheAge: number;
    cleanupInterval: number;
  };
}

export class IntegratedTicketSystem {
  private connection: Connection;
  private program: Program<NftEvoTickets>;
  private rpcOptimizer: RPCOptimizer;
  private scannerBot: ScannerBot;
  private batchMinter: BatchTicketMinter;
  private offlineFallback: OfflineFallback;
  private config: IntegratedTicketSystemConfig;

  constructor(config: IntegratedTicketSystemConfig) {
    this.config = config;
    
    // Initialize connection
    this.connection = new Connection(config.rpc.primaryRpcUrl, 'confirmed');
    
    // Initialize program
    const provider = new AnchorProvider(
      this.connection,
      {} as any, // You would pass actual wallet here
      { commitment: 'confirmed' }
    );
    this.program = new Program(NftEvoTickets as any, provider);
    
    // Initialize components
    this.rpcOptimizer = createRPCOptimizer(config.rpc, this.program);
    this.scannerBot = createScannerBot(config.scanner);
    this.offlineFallback = createOfflineFallback();
  }

  // Initialize batch minter
  async initializeBatchMinter(
    eventPda: PublicKey,
    authority: Keypair
  ): Promise<void> {
    this.batchMinter = await createBatchMinter(
      this.connection,
      eventPda,
      authority
    );
  }

  // Start all services
  async start(): Promise<void> {
    console.log('Starting Integrated Ticket System...');
    
    try {
      // Start scanner bot
      await this.scannerBot.start();
      console.log('✓ Scanner Bot started');
      
      // Start RPC health monitoring
      await this.startRPCHealthMonitoring();
      console.log('✓ RPC Health monitoring started');
      
      // Start offline cleanup
      this.startOfflineCleanup();
      console.log('✓ Offline cleanup started');
      
      console.log('✓ All services started successfully');
      
    } catch (error) {
      console.error('Failed to start services:', error);
      throw error;
    }
  }

  // Stop all services
  async stop(): Promise<void> {
    console.log('Stopping Integrated Ticket System...');
    
    try {
      await this.scannerBot.stop();
      console.log('✓ Scanner Bot stopped');
      
      console.log('✓ All services stopped successfully');
      
    } catch (error) {
      console.error('Error stopping services:', error);
    }
  }

  // Batch mint tickets with optimization
  async batchMintTickets(
    eventPda: PublicKey,
    authority: Keypair,
    ticketCount: number
  ): Promise<{
    successful: PublicKey[];
    failed: { ticketIndex: number; error: any }[];
    totalCost: number;
  }> {
    console.log(`Starting batch minting of ${ticketCount} tickets`);
    
    // Initialize batch minter if not already done
    if (!this.batchMinter) {
      await this.initializeBatchMinter(eventPda, authority);
    }

    // Use RPC optimizer for better performance
    const startTime = Date.now();
    const results = await this.batchMinter.mintBatchTickets();
    const endTime = Date.now();

    console.log(`Batch minting completed in ${endTime - startTime}ms`);
    console.log(`Success rate: ${(results.successful.length / ticketCount * 100).toFixed(2)}%`);

    return results;
  }

  // Update ticket with offline fallback
  async updateTicket(
    ticketMint: PublicKey,
    newStage: TicketStage,
    metadataUri?: string,
    eventId?: string
  ): Promise<boolean> {
    try {
      // Try online update first
      if (this.isOnline()) {
        await this.scannerBot.queueTicketUpdate(ticketMint, newStage, metadataUri);
        console.log(`Ticket update queued: ${ticketMint.toString()}`);
        return true;
      } else {
        // Fallback to offline update
        console.log(`Performing offline update for: ${ticketMint.toString()}`);
        
        const ticketData = {
          ticketMint: ticketMint.toString(),
          eventId: eventId || 'unknown',
          stage: newStage,
          metadataUri: metadataUri || '',
          qrCodeData: this.offlineFallback.generateOfflineQRCode(
            ticketMint.toString(),
            eventId || 'unknown'
          ),
          timestamp: Date.now()
        };

        this.offlineFallback.storeTicketData(ticketData);
        this.offlineFallback.queueUpdateForSync(ticketData);
        
        return true;
      }
    } catch (error) {
      console.error(`Failed to update ticket ${ticketMint.toString()}:`, error);
      return false;
    }
  }

  // Get ticket status with caching
  async getTicketStatus(ticketMint: PublicKey): Promise<{
    stage: TicketStage;
    metadataUri: string;
    isOffline: boolean;
    lastUpdated: number;
  } | null> {
    try {
      // Try cached data first
      const cached = this.offlineFallback.getTicketData(ticketMint.toString());
      if (cached) {
        return {
          stage: cached.stage,
          metadataUri: cached.metadataUri,
          isOffline: true,
          lastUpdated: cached.timestamp
        };
      }

      // Fetch from blockchain with RPC optimization
      const accountInfo = await this.rpcOptimizer.getAccountInfo(ticketMint);
      
      if (accountInfo) {
        // Parse account data to get ticket stage
        // This would depend on your specific account structure
        return {
          stage: TicketStage.Prestige, // You would parse this from account data
          metadataUri: '', // You would get this from metadata account
          isOffline: false,
          lastUpdated: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to get ticket status: ${error}`);
      return null;
    }
  }

  // Validate ticket with offline support
  async validateTicket(
    ticketMint: PublicKey,
    eventId: string
  ): Promise<{
    valid: boolean;
    stage: TicketStage;
    message: string;
    isOffline: boolean;
  }> {
    // Try offline validation first
    const offlineResult = this.offlineFallback.validateTicketOffline(
      ticketMint.toString(),
      eventId
    );

    if (offlineResult.valid) {
      return {
        ...offlineResult,
        isOffline: true
      };
    }

    // If offline validation fails, try online
    if (this.isOnline()) {
      try {
        const status = await this.getTicketStatus(ticketMint);
        if (status) {
          return {
            valid: status.stage === TicketStage.Qr,
            stage: status.stage,
            message: status.stage === TicketStage.Qr ? 'Valid for scanning' : 'Invalid stage',
            isOffline: false
          };
        }
      } catch (error) {
        console.error('Online validation failed:', error);
      }
    }

    return {
      valid: false,
      stage: TicketStage.Prestige,
      message: 'Unable to validate ticket',
      isOffline: !this.isOnline()
    };
  }

  // Get system status
  async getSystemStatus(): Promise<{
    rpc: any;
    scanner: any;
    offline: any;
    cache: any;
  }> {
    const rpcHealth = await this.rpcOptimizer.healthCheck();
    const scannerStatus = this.scannerBot.getQueueStatus();
    const cacheStats = this.rpcOptimizer.getCacheStats();

    return {
      rpc: rpcHealth,
      scanner: scannerStatus,
      offline: {
        isOnline: this.isOnline(),
        cacheSize: this.offlineFallback.getCacheStats()
      },
      cache: cacheStats
    };
  }

  // Sync offline data when back online
  async syncOfflineData(): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.isOnline()) {
      return { successful: 0, failed: 0, errors: ['Not online'] };
    }

    console.log('Syncing offline data...');
    const results = await this.offlineFallback.syncQueuedUpdates();
    
    if (results.successful > 0) {
      console.log(`Successfully synced ${results.successful} offline updates`);
    }
    
    if (results.failed > 0) {
      console.warn(`Failed to sync ${results.failed} offline updates`);
    }

    return results;
  }

  // Private methods
  private isOnline(): boolean {
    return navigator.onLine;
  }

  private async startRPCHealthMonitoring(): Promise<void> {
    setInterval(async () => {
      try {
        const health = await this.rpcOptimizer.healthCheck();
        if (!health.primary && health.fallbacks.every(f => !f)) {
          console.warn('All RPC connections are down!');
        }
      } catch (error) {
        console.error('RPC health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private startOfflineCleanup(): void {
    setInterval(() => {
      this.offlineFallback.cleanupStaleData(this.config.offline.maxCacheAge);
    }, this.config.offline.cleanupInterval);
  }
}

// Factory function
export function createIntegratedTicketSystem(config: IntegratedTicketSystemConfig): IntegratedTicketSystem {
  return new IntegratedTicketSystem(config);
}

// Usage example
export async function initializeTicketSystem(): Promise<IntegratedTicketSystem> {
  const config: IntegratedTicketSystemConfig = {
    rpc: {
      primaryRpcUrl: process.env.PRIMARY_RPC_URL || 'https://api.devnet.solana.com',
      fallbackRpcUrls: [
        process.env.FALLBACK_RPC_1 || 'https://solana-api.projectserum.com',
        process.env.FALLBACK_RPC_2 || 'https://rpc.ankr.com/solana_devnet'
      ],
      cacheTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000
    },
    scanner: {
      rpcUrl: process.env.SCANNER_RPC_URL || 'https://api.devnet.solana.com',
      scannerWallet: process.env.SCANNER_WALLET || '',
      programId: process.env.PROGRAM_ID || 'G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr',
      eventPda: process.env.EVENT_PDA || '',
      authorityPda: process.env.AUTHORITY_PDA || '',
      updateInterval: 5000,
      retryAttempts: 3
    },
    batchMinting: {
      ticketCount: 100,
      batchSize: 10,
      retryAttempts: 3,
      delayBetweenBatches: 2000
    },
    offline: {
      maxCacheAge: 3600000, // 1 hour
      cleanupInterval: 300000 // 5 minutes
    }
  };

  const system = createIntegratedTicketSystem(config);
  await system.start();
  
  return system;
}
