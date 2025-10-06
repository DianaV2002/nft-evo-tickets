import { PublicKey } from '@solana/web3.js';
import { TicketStage } from '../../programs/nft-evo-tickets/src/state';

export interface OfflineTicketData {
  ticketMint: string;
  eventId: string;
  stage: TicketStage;
  metadataUri: string;
  qrCodeData: string;
  timestamp: number;
  signature?: string;
}

export interface OfflineCache {
  tickets: Map<string, OfflineTicketData>;
  events: Map<string, EventData>;
  lastSync: number;
}

export interface EventData {
  eventId: string;
  name: string;
  startTime: number;
  endTime: number;
  authority: string;
  scanner: string;
}

export class OfflineFallback {
  private cache: OfflineCache;
  private storageKey: string = 'nft-evo-tickets-offline-cache';
  private syncQueue: OfflineTicketData[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.cache = {
      tickets: new Map(),
      events: new Map(),
      lastSync: 0
    };
    
    this.loadFromStorage();
    this.startOfflineDetection();
  }

  // Store ticket data for offline access
  storeTicketData(ticketData: OfflineTicketData): void {
    console.log(`Storing ticket data offline: ${ticketData.ticketMint}`);
    
    this.cache.tickets.set(ticketData.ticketMint, ticketData);
    this.saveToStorage();
  }

  // Get ticket data (offline or online)
  getTicketData(ticketMint: string): OfflineTicketData | null {
    const cached = this.cache.tickets.get(ticketMint);
    
    if (cached) {
      console.log(`Retrieved ticket data from cache: ${ticketMint}`);
      return cached;
    }
    
    return null;
  }

  // Generate QR code data for offline use
  generateOfflineQRCode(ticketMint: string, eventId: string): string {
    const qrData = {
      ticketMint,
      eventId,
      timestamp: Date.now(),
      offline: true
    };
    
    return JSON.stringify(qrData);
  }

  // Validate ticket offline
  validateTicketOffline(ticketMint: string, eventId: string): {
    valid: boolean;
    stage: TicketStage;
    message: string;
  } {
    const ticketData = this.getTicketData(ticketMint);
    
    if (!ticketData) {
      return {
        valid: false,
        stage: TicketStage.Prestige,
        message: 'Ticket not found in offline cache'
      };
    }

    if (ticketData.eventId !== eventId) {
      return {
        valid: false,
        stage: ticketData.stage,
        message: 'Ticket does not belong to this event'
      };
    }

    // Check if ticket is in valid stage for scanning
    if (ticketData.stage !== TicketStage.Qr) {
      return {
        valid: false,
        stage: ticketData.stage,
        message: `Ticket is in ${TicketStage[ticketData.stage]} stage, expected QR`
      };
    }

    return {
      valid: true,
      stage: ticketData.stage,
      message: 'Ticket is valid for scanning'
    };
  }

  // Update ticket stage offline
  updateTicketStageOffline(ticketMint: string, newStage: TicketStage): boolean {
    const ticketData = this.cache.tickets.get(ticketMint);
    
    if (!ticketData) {
      console.error(`Ticket not found for stage update: ${ticketMint}`);
      return false;
    }

    ticketData.stage = newStage;
    ticketData.timestamp = Date.now();
    
    this.cache.tickets.set(ticketMint, ticketData);
    this.saveToStorage();
    
    console.log(`Updated ticket stage offline: ${ticketMint} -> ${TicketStage[newStage]}`);
    return true;
  }

  // Queue update for when online
  queueUpdateForSync(ticketData: OfflineTicketData): void {
    console.log(`Queuing update for sync: ${ticketData.ticketMint}`);
    this.syncQueue.push(ticketData);
  }

  // Sync queued updates when online
  async syncQueuedUpdates(): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    console.log(`Syncing ${this.syncQueue.length} queued updates...`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const ticketData of this.syncQueue) {
      try {
        // Here you would call your actual blockchain update
        // await this.updateTicketOnChain(ticketData);
        
        console.log(`Successfully synced: ${ticketData.ticketMint}`);
        results.successful++;
        
      } catch (error) {
        console.error(`Failed to sync: ${ticketData.ticketMint}`, error);
        results.failed++;
        results.errors.push(`${ticketData.ticketMint}: ${error}`);
      }
    }

    // Clear sync queue after processing
    this.syncQueue = [];
    
    console.log(`Sync completed: ${results.successful} successful, ${results.failed} failed`);
    return results;
  }

  // Store event data for offline access
  storeEventData(eventData: EventData): void {
    console.log(`Storing event data offline: ${eventData.eventId}`);
    this.cache.events.set(eventData.eventId, eventData);
    this.saveToStorage();
  }

  // Get event data
  getEventData(eventId: string): EventData | null {
    return this.cache.events.get(eventId) || null;
  }

  // Generate offline metadata
  generateOfflineMetadata(ticketData: OfflineTicketData): any {
    return {
      name: `Ticket ${ticketData.ticketMint.slice(0, 8)}`,
      description: `Offline ticket for event ${ticketData.eventId}`,
      image: ticketData.metadataUri,
      attributes: [
        { trait_type: 'Event ID', value: ticketData.eventId },
        { trait_type: 'Stage', value: TicketStage[ticketData.stage] },
        { trait_type: 'Offline', value: 'true' },
        { trait_type: 'Timestamp', value: ticketData.timestamp }
      ],
      properties: {
        category: 'ticket',
        offline: true
      }
    };
  }

  // Check if data is stale
  isDataStale(ticketMint: string, maxAge: number = 300000): boolean { // 5 minutes default
    const ticketData = this.cache.tickets.get(ticketMint);
    
    if (!ticketData) {
      return true;
    }

    return Date.now() - ticketData.timestamp > maxAge;
  }

  // Clean up stale data
  cleanupStaleData(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    let cleaned = 0;

    for (const [ticketMint, ticketData] of this.cache.tickets) {
      if (now - ticketData.timestamp > maxAge) {
        this.cache.tickets.delete(ticketMint);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} stale ticket entries`);
    this.saveToStorage();
  }

  // Export cache for backup
  exportCache(): string {
    const exportData = {
      tickets: Array.from(this.cache.tickets.entries()),
      events: Array.from(this.cache.events.entries()),
      lastSync: this.cache.lastSync,
      exportTime: Date.now()
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import cache from backup
  importCache(cacheData: string): boolean {
    try {
      const data = JSON.parse(cacheData);
      
      this.cache.tickets = new Map(data.tickets);
      this.cache.events = new Map(data.events);
      this.cache.lastSync = data.lastSync;
      
      this.saveToStorage();
      console.log('Cache imported successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to import cache:', error);
      return false;
    }
  }

  // Private methods
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache.tickets = new Map(data.tickets || []);
        this.cache.events = new Map(data.events || []);
        this.cache.lastSync = data.lastSync || 0;
        console.log('Loaded offline cache from storage');
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        tickets: Array.from(this.cache.tickets.entries()),
        events: Array.from(this.cache.events.entries()),
        lastSync: this.cache.lastSync
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  private startOfflineDetection(): void {
    // Simple online/offline detection
    setInterval(() => {
      this.isOnline = navigator.onLine;
      
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncQueuedUpdates();
      }
    }, 5000); // Check every 5 seconds

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Connection restored');
      this.isOnline = true;
      this.syncQueuedUpdates();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      this.isOnline = false;
    });
  }
}

// Factory function
export function createOfflineFallback(): OfflineFallback {
  return new OfflineFallback();
}

// Usage example
export async function initializeOfflineFallback(): Promise<OfflineFallback> {
  const fallback = createOfflineFallback();
  
  // Set up periodic cleanup
  setInterval(() => {
    fallback.cleanupStaleData();
  }, 3600000); // Clean up every hour
  
  return fallback;
}
