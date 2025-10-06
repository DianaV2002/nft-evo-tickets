import { Connection, PublicKey, GetAccountInfoConfig } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { NftEvoTickets } from '../../app/src/nft_evo_tickets.json';

export interface RPCConfig {
  primaryRpcUrl: string;
  fallbackRpcUrls: string[];
  websocketUrl?: string;
  cacheTimeout: number; // milliseconds
  maxRetries: number;
  retryDelay: number;
}

export class RPCOptimizer {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private config: RPCConfig;
  private program: Program<NftEvoTickets>;

  constructor(config: RPCConfig, program: Program<NftEvoTickets>) {
    this.config = config;
    this.program = program;
    
    // Initialize multiple connections for failover
    this.connections = [
      new Connection(config.primaryRpcUrl, 'confirmed'),
      ...config.fallbackRpcUrls.map(url => new Connection(url, 'confirmed'))
    ];
  }

  // Get current connection with failover
  private getCurrentConnection(): Connection {
    return this.connections[this.currentConnectionIndex];
  }

  // Switch to next connection on failure
  private switchConnection(): void {
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
    console.log(`Switched to RPC connection ${this.currentConnectionIndex + 1}`);
  }

  // Cached account fetch with retry logic
  async getAccountInfo(
    publicKey: PublicKey, 
    config?: GetAccountInfoConfig,
    useCache: boolean = true
  ): Promise<any> {
    const cacheKey = `account_${publicKey.toString()}_${JSON.stringify(config)}`;
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        console.log(`Cache hit for account: ${publicKey.toString()}`);
        return cached.data;
      }
    }

    // Fetch from RPC with retry
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const connection = this.getCurrentConnection();
        const accountInfo = await connection.getAccountInfo(publicKey, config);
        
        // Cache the result
        if (useCache) {
          this.cache.set(cacheKey, {
            data: accountInfo,
            timestamp: Date.now()
          });
        }
        
        return accountInfo;
        
      } catch (error) {
        console.error(`RPC attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.maxRetries) {
          this.switchConnection();
          await this.delay(this.config.retryDelay * attempt);
        } else {
          throw new Error(`All RPC connections failed: ${error}`);
        }
      }
    }
  }

  // Cached program account fetch
  async getProgramAccount(
    accountType: string,
    useCache: boolean = true
  ): Promise<any[]> {
    const cacheKey = `program_${accountType}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        console.log(`Cache hit for program account: ${accountType}`);
        return cached.data;
      }
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const connection = this.getCurrentConnection();
        const accounts = await this.program.account[accountType].all();
        
        if (useCache) {
          this.cache.set(cacheKey, {
            data: accounts,
            timestamp: Date.now()
          });
        }
        
        return accounts;
        
      } catch (error) {
        console.error(`Program account fetch attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.maxRetries) {
          this.switchConnection();
          await this.delay(this.config.retryDelay * attempt);
        } else {
          throw new Error(`Failed to fetch program accounts: ${error}`);
        }
      }
    }
  }

  // Real-time subscription for ticket updates
  async subscribeToTicketUpdates(
    ticketMint: PublicKey,
    callback: (data: any) => void
  ): Promise<number> {
    try {
      const connection = this.getCurrentConnection();
      
      // Subscribe to account changes
      const subscriptionId = connection.onAccountChange(
        ticketMint,
        (accountInfo) => {
          console.log(`Ticket update received: ${ticketMint.toString()}`);
          callback(accountInfo);
        },
        'confirmed'
      );
      
      console.log(`Subscribed to ticket updates: ${ticketMint.toString()}`);
      return subscriptionId;
      
    } catch (error) {
      console.error('Failed to subscribe to ticket updates:', error);
      throw error;
    }
  }

  // Unsubscribe from updates
  async unsubscribe(subscriptionId: number): Promise<void> {
    try {
      const connection = this.getCurrentConnection();
      await connection.removeAccountChangeListener(subscriptionId);
      console.log(`Unsubscribed from updates: ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  // Batch fetch multiple accounts
  async getMultipleAccounts(
    publicKeys: PublicKey[],
    useCache: boolean = true
  ): Promise<any[]> {
    const cacheKey = `batch_${publicKeys.map(pk => pk.toString()).join('_')}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        console.log(`Cache hit for batch accounts`);
        return cached.data;
      }
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const connection = this.getCurrentConnection();
        const accounts = await connection.getMultipleAccountsInfo(publicKeys);
        
        if (useCache) {
          this.cache.set(cacheKey, {
            data: accounts,
            timestamp: Date.now()
          });
        }
        
        return accounts;
        
      } catch (error) {
        console.error(`Batch fetch attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.maxRetries) {
          this.switchConnection();
          await this.delay(this.config.retryDelay * attempt);
        } else {
          throw new Error(`Failed to fetch multiple accounts: ${error}`);
        }
      }
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Health check for all connections
  async healthCheck(): Promise<{
    primary: boolean;
    fallbacks: boolean[];
    currentConnection: number;
  }> {
    const results = {
      primary: false,
      fallbacks: [] as boolean[],
      currentConnection: this.currentConnectionIndex
    };

    // Check primary connection
    try {
      await this.connections[0].getLatestBlockhash();
      results.primary = true;
    } catch (error) {
      console.error('Primary RPC connection failed:', error);
    }

    // Check fallback connections
    for (let i = 1; i < this.connections.length; i++) {
      try {
        await this.connections[i].getLatestBlockhash();
        results.fallbacks.push(true);
      } catch (error) {
        console.error(`Fallback RPC connection ${i} failed:`, error);
        results.fallbacks.push(false);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function
export function createRPCOptimizer(config: RPCConfig, program: Program<NftEvoTickets>): RPCOptimizer {
  return new RPCOptimizer(config, program);
}

// Usage example
export async function initializeRPCOptimizer(): Promise<RPCOptimizer> {
  const config: RPCConfig = {
    primaryRpcUrl: process.env.PRIMARY_RPC_URL || 'https://api.devnet.solana.com',
    fallbackRpcUrls: [
      process.env.FALLBACK_RPC_1 || 'https://solana-api.projectserum.com',
      process.env.FALLBACK_RPC_2 || 'https://rpc.ankr.com/solana_devnet'
    ],
    websocketUrl: process.env.WEBSOCKET_URL,
    cacheTimeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000 // 1 second
  };

  // You would initialize your program here
  // const program = new Program(NftEvoTickets, provider);
  
  return createRPCOptimizer(config, null as any); // Replace with actual program
}
