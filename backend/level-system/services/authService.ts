import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Message format for wallet signature verification
 */
export const AUTH_MESSAGE = 'Sign this message to authenticate with NFT Evo Tickets Level System';

/**
 * Verify wallet signature
 * Simple and secure: user signs a standard message with their wallet
 */
export function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string = AUTH_MESSAGE
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate nonce for additional security (optional)
 * Can be used to prevent replay attacks
 */
export function generateNonce(): string {
  return bs58.encode(nacl.randomBytes(32));
}
