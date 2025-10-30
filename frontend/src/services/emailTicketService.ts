import { Connection, PublicKey } from '@solana/web3.js';

export interface TicketPurchaseRequest {
  walletAddress: string;
  eventPublicKey: string;
  ticketPriceLamports: number;
  seat?: string;
}

export interface TicketPurchaseResponse {
  success: boolean;
  transactionSignature: string;
  explorerUrl: string;
  ticketId: number;
  nftMint: string;
  ticketAccount: string;
}

/**
 * Purchase a ticket for an email/social user via backend
 */
export async function purchaseTicketForEmailUser(
  request: TicketPurchaseRequest
): Promise<TicketPurchaseResponse> {
  try {
    const response = await fetch('/api/tickets/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to purchase ticket');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error purchasing ticket for email user:', error);
    throw error;
  }
}

/**
 * Check if user is an email/social user (not wallet user)
 */
export function isEmailUser(authMethod: string): boolean {
  return authMethod === 'email' || authMethod === 'google' || authMethod === 'facebook';
}
