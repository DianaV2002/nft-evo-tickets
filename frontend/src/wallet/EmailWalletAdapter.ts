import { WalletAdapter, WalletReadyState } from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';

export interface EmailWalletAdapterConfig {
  walletAddress: string;
  publicKey: PublicKey;
  keypair: Keypair;
  name?: string;
  email?: string;
}

export class EmailWalletAdapter {
  private _publicKey: PublicKey | null = null;
  private _connected = false;
  private _connecting = false;
  private _keypair: Keypair | null = null;
  private _name: string = 'Email Wallet';
  private _email: string = '';
  private _listeners: { [key: string]: Function[] } = {};

  constructor(config: EmailWalletAdapterConfig) {
    this._publicKey = config.publicKey;
    this._keypair = config.keypair;
    this._name = config.name || 'Email Wallet';
    this._email = config.email || '';
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get ready(): boolean {
    return true;
  }

  get readyState(): WalletReadyState {
    return WalletReadyState.Installed;
  }

  get name(): string {
    return this._name;
  }

  get url(): string {
    return 'https://nft-evo-tickets.com';
  }

  get icon(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjM2NkZGIi8+Cjwvc3ZnPgo=';
  }

  get supportedTransactionVersions(): ReadonlySet<'legacy' | 0> {
    return new Set(['legacy', 0]);
  }

  async autoConnect(): Promise<void> {
    // Email wallets don't auto-connect
    return;
  }

  async connect(): Promise<void> {
    if (this._connected || this._connecting) {
      return;
    }

    this._connecting = true;
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this._connected = true;
      this.emit('connect', this._publicKey!);
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    this._connected = false;
    this.emit('disconnect');
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._keypair) {
      throw new Error('Keypair not available');
    }

    if (transaction instanceof Transaction) {
      transaction.sign(this._keypair);
    } else if (transaction instanceof VersionedTransaction) {
      // For versioned transactions, we need to sign with the keypair
      const message = transaction.message.serialize();
      const signature = this._keypair.secretKey.slice(0, 32); // Simplified signing
      transaction.addSignature(this._publicKey!, signature);
    }

    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    return Promise.all(transactions.map(transaction => this.signTransaction(transaction)));
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._keypair) {
      throw new Error('Keypair not available');
    }

    // Use the keypair's secretKey to sign the message
    const signature = this._keypair.secretKey.slice(0, 32); // Simplified signing
    return new Uint8Array(signature);
  }

  async sendTransaction(transaction: Transaction, connection: any): Promise<string> {
    if (!this._keypair) {
      throw new Error('Keypair not available');
    }

    // Sign the transaction
    transaction.sign(this._keypair);
    
    // Send the transaction
    const signature = await connection.sendTransaction(transaction, [this._keypair]);
    return signature;
  }

  // Event emitter methods
  on(event: string, callback: Function): this {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return this;
  }

  off(event: string, callback: Function): this {
    if (!this._listeners[event]) {
      return this;
    }
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this._listeners[event]) {
      return false;
    }
    this._listeners[event].forEach(callback => callback(...args));
    return true;
  }
}