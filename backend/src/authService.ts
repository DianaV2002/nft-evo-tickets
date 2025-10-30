import { Keypair, PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { web3 } from '@coral-xyz/anchor';
import { getAuthDatabase } from './database/authDb';
import { hashPassword, comparePassword, sanitizeInput } from './utils/security';

export interface UserAuth {
  walletAddress: string;
  publicKey: PublicKey;
  keypair?: Keypair;
  authMethod: 'wallet' | 'email' | 'google' | 'facebook';
  email?: string;
  name?: string;
  avatar?: string;
}

export interface EmailAuthRequest {
  email: string;
  password: string;
}

export interface SocialAuthRequest {
  provider: 'google' | 'facebook';
  token: string;
  email: string;
  name: string;
  avatar?: string;
}

export function generateWalletFromEmail(email: string): { keypair: Keypair; publicKey: PublicKey } {
  const seed = createHash('sha256').update(email.toLowerCase().trim()).digest();
  const keypair = Keypair.fromSeed(seed);
  
  return {
    keypair,
    publicKey: keypair.publicKey
  };
}

export function generateWalletFromSocial(provider: string, email: string, userId: string): { keypair: Keypair; publicKey: PublicKey } {
  // Create a deterministic seed from provider + email + userId
  const seedData = `${provider}:${email}:${userId}`;
  const seed = createHash('sha256').update(seedData.toLowerCase().trim()).digest();
  
  // Generate keypair from seed
  const keypair = Keypair.fromSeed(seed);
  
  return {
    keypair,
    publicKey: keypair.publicKey
  };
}

export async function authenticateWithEmail(email: string, password: string): Promise<UserAuth> {
  const db = getAuthDatabase();
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
  
  const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = 'email'
  `).get(sanitizedEmail) as any;
  
  if (!existingAuth) {
    throw new Error('User not found');
  }
  
  // Use secure password comparison
  const isValidPassword = await comparePassword(password, existingAuth.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }
  
  let user = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(existingAuth.wallet_address) as any;
  
  if (!user) {
    db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(existingAuth.wallet_address);
    user = { wallet_address: existingAuth.wallet_address };
  }
  
  const { keypair, publicKey } = generateWalletFromEmail(sanitizedEmail);
  
  return {
    walletAddress: existingAuth.wallet_address,
    publicKey,
    keypair,
    authMethod: 'email',
    email: existingAuth.email,
    name: existingAuth.name,
    avatar: existingAuth.avatar_url
  };
}

export async function authenticateWithSocial(request: SocialAuthRequest): Promise<UserAuth> {
  const db = getAuthDatabase();
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeInput(request.email.toLowerCase().trim());
  
  const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = ? AND social_provider_id = ?
  `).get(sanitizedEmail, request.provider, request.token) as any;
  
  if (!existingAuth) {
    throw new Error('User not found');
  }
  
  let user = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(existingAuth.wallet_address) as any;
  
  if (!user) {
    db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(existingAuth.wallet_address);
    user = { wallet_address: existingAuth.wallet_address };
  }
  
  const { keypair, publicKey } = generateWalletFromSocial(
    request.provider,
    sanitizedEmail,
    request.token
  );
  
  return {
    walletAddress: existingAuth.wallet_address,
    publicKey,
    keypair,
    authMethod: request.provider,
    email: existingAuth.email,
    name: existingAuth.name,
    avatar: existingAuth.avatar_url
  };
}


export function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    // TODO: Implement actual signature verification
    return true; // Placeholder
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function createEmailUser(email: string, password: string, name?: string): Promise<UserAuth> {
  try {
    const db = getAuthDatabase();
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    const sanitizedName = name ? sanitizeInput(name) : null;
    
    const existingAuth = db.prepare(`
      SELECT * FROM user_auth WHERE email = ?
    `).get(sanitizedEmail) as any;
    
    if (existingAuth) {
      throw new Error('User already exists');
    }
    
    // Generate wallet address
    const { keypair, publicKey } = generateWalletFromEmail(sanitizedEmail);
    const walletAddress = publicKey.toBase58();
    
    // Hash password securely
    const passwordHash = await hashPassword(password);
    
    // Insert into users table first
    db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(walletAddress);
    
    // Insert into user_auth table
    db.prepare(`
      INSERT INTO user_auth (wallet_address, auth_method, email, password_hash, name)
      VALUES (?, 'email', ?, ?, ?)
    `).run(walletAddress, sanitizedEmail, passwordHash, sanitizedName);
  
    return {
      walletAddress,
      publicKey,
      keypair,
      authMethod: 'email',
      email: sanitizedEmail,
      name: sanitizedName || undefined
    };
  } catch (error) {
    console.error('Error in createEmailUser:', error);
    throw error;
  }
}

/**
 * Create new user with social authentication
 */
export async function createSocialUser(request: SocialAuthRequest): Promise<UserAuth> {
  const db = getAuthDatabase();
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeInput(request.email.toLowerCase().trim());
  const sanitizedName = sanitizeInput(request.name);
  
  // Check if user already exists
  const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = ? AND social_provider_id = ?
  `).get(sanitizedEmail, request.provider, request.token) as any;
  
  if (existingAuth) {
    throw new Error('User already exists');
  }
  
  // Generate wallet address
  const { keypair, publicKey } = generateWalletFromSocial(
    request.provider,
    sanitizedEmail,
    request.token
  );
  const walletAddress = publicKey.toBase58();
  
  // Insert into users table first
  db.prepare(`
    INSERT INTO users (wallet_address) VALUES (?)
  `).run(walletAddress);
  
  // Insert into user_auth table
  db.prepare(`
    INSERT INTO user_auth (wallet_address, auth_method, email, name, avatar_url, social_provider_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    walletAddress,
    request.provider,
    sanitizedEmail,
    sanitizedName,
    request.avatar || null,
    request.token
  );
  
  return {
    walletAddress,
    publicKey,
    keypair,
    authMethod: request.provider,
    email: sanitizedEmail,
    name: sanitizedName,
    avatar: request.avatar
  };
}

function generateKeypairFromAddress(walletAddress: string): Keypair {
  // This function should not be used - we need the original email to generate the correct keypair
  // Instead, we should store the keypair or use the email directly
  throw new Error('Cannot generate keypair from wallet address - need original email');
}

export function getUserByWalletAddress(walletAddress: string): UserAuth | null {
  const db = getAuthDatabase();
  
  const authData = db.prepare(`
    SELECT * FROM user_auth WHERE wallet_address = ?
  `).get(walletAddress) as any;
  
  if (!authData) {
    return null;
  }
  
  // Generate keypair from email for email/social users (same method as registration)
  let keypair: Keypair | undefined;
  if (authData.auth_method !== 'wallet') {
    if (authData.auth_method === 'email') {
      keypair = generateWalletFromEmail(authData.email).keypair;
    } else {
      // For social auth, we need the original provider and token to regenerate the keypair
      // For now, we'll use the email as a fallback
      keypair = generateWalletFromEmail(authData.email).keypair;
    }
  }
  
  return {
    walletAddress: authData.wallet_address,
    publicKey: new PublicKey(authData.wallet_address),
    keypair: keypair,
    authMethod: authData.auth_method,
    email: authData.email,
    name: authData.name,
    avatar: authData.avatar_url
  };
}

export async function storeUserAuth(userAuth: UserAuth): Promise<void> {
  const db = getAuthDatabase();
  
  // Check if auth record exists
  const existingAuth = db.prepare(`
    SELECT * FROM user_auth WHERE wallet_address = ?
  `).get(userAuth.walletAddress) as any;
  
  if (!existingAuth) {
    // Insert auth record
    db.prepare(`
      INSERT INTO user_auth (wallet_address, auth_method, email, name, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userAuth.walletAddress,
      userAuth.authMethod,
      userAuth.email || null,
      userAuth.name || null,
      userAuth.avatar || null
    );
  }
  
  // Ensure user exists in users table
  const existingUser = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(userAuth.walletAddress) as any;
  
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(userAuth.walletAddress);
  }
}
