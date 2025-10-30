import { EmailWalletAdapter, EmailWalletAdapterConfig } from './EmailWalletAdapter';
import { PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';

export interface EmailWalletConnectionData {
  walletAddress: string;
  publicKey: string;
  authMethod: string;
  email?: string;
  name?: string;
  avatar?: string;
}

// Connection cache to prevent duplicate requests
const connectionCache = new Map<string, { adapter: EmailWalletAdapter; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function connectEmailWallet(walletAddress: string): Promise<EmailWalletAdapter> {
  // Check cache first
  const cached = connectionCache.get(walletAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached email wallet connection for:', walletAddress);
    return cached.adapter;
  }

  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Get the wallet connection data from backend
      const response = await fetch(`/api/auth/wallet-connection/${walletAddress}`);
      
      if (!response.ok) {
        if (response.status === 429 && retryCount < maxRetries - 1) {
          // Rate limited - wait and retry
          const waitTime = Math.pow(2, retryCount) * 2000; // Increased base wait time
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        throw new Error('Failed to get wallet connection data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get wallet connection data');
      }

      //deterministic keypair from wallet address
      
      const publicKey = new PublicKey(data.publicKey);
      
      const keypair = await generateKeypairFromAddress(walletAddress);
      
      const config: EmailWalletAdapterConfig = {
        walletAddress: data.walletAddress,
        publicKey: publicKey,
        keypair: keypair,
        name: data.name || 'Email User',
        email: data.email
      };

      const adapter = new EmailWalletAdapter(config);
      
      await adapter.connect();
      
      // Cache the connection
      connectionCache.set(walletAddress, { adapter, timestamp: Date.now() });
      
      return adapter;
    } catch (error: any) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('Error connecting email wallet after retries:', error);
        throw error;
      }
      
      // Wait before retry
      const waitTime = Math.pow(2, retryCount) * 2000;
      console.log(`Error connecting wallet, waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Failed to connect email wallet after all retries');
}

async function generateKeypairFromAddress(walletAddress: string): Promise<Keypair> {
  // Use Web Crypto API for proper cryptographic hash function
  const seed = new TextEncoder().encode(walletAddress);
  
  // Use SHA-256 hash for proper cryptographic security
  const hashBuffer = await crypto.subtle.digest('SHA-256', seed as BufferSource);
  const hash = new Uint8Array(hashBuffer);
  
  // Use Anchor's web3.Keypair.fromSeed with the proper hash
  const keypair = web3.Keypair.fromSeed(hash);
  
  return keypair;
}

export async function isEmailUserWallet(walletAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/auth/wallet-connection/${walletAddress}`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success && data.authMethod !== 'wallet';
  } catch (error) {
    console.error('Error checking if wallet is email user:', error);
    return false;
  }
}

// Function to clear the connection cache
export function clearEmailWalletCache(): void {
  connectionCache.clear();
  console.log('Email wallet connection cache cleared');
}
