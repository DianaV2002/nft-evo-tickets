import { EventData } from '@/services/eventService';

export interface CreateEventForEmailUserParams {
  walletAddress: string;
  name: string;
  startDate: Date;
  endDate: Date;
  ticketSupply: number;
  coverPhotoUrl?: string;
}

export interface CreateEventForEmailUserResult {
  success: boolean;
  transactionSignature: string;
  eventName: string;
  walletAddress: string;
}

export async function createEventForEmailUser(params: CreateEventForEmailUserParams): Promise<CreateEventForEmailUserResult> {
  try {
    const response = await fetch('/api/events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: params.walletAddress,
        name: params.name,
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        ticketSupply: params.ticketSupply,
        coverPhotoUrl: params.coverPhotoUrl
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create event');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating event for email user:', error);
    throw error;
  }
}
