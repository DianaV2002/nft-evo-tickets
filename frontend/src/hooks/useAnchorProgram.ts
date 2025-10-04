import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import idl from '@/anchor-idl/nft_evo_tickets.json';

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  // Example function to create an event
  const createEvent = async (eventData: {
    name: string;
    description: string;
    date: Date;
    venue: string;
    maxTickets: number;
  }) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    
    try {
      // This would be implemented based on your Anchor program's create_event instruction
      console.log('Creating event:', eventData);
      // const tx = await program.methods.createEvent(...).rpc();
      // return tx;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  // Example function to mint ticket
  const mintTicket = async (eventId: string, ticketData: {
    tier: string;
    price: number;
  }) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    
    try {
      console.log('Minting ticket:', { eventId, ticketData });
      // Implementation would go here
    } catch (error) {
      console.error('Error minting ticket:', error);
      throw error;
    }
  };

  // Example function to list ticket for sale
  const listTicket = async (ticketId: string, price: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    
    try {
      console.log('Listing ticket:', { ticketId, price });
      // Implementation would go here
    } catch (error) {
      console.error('Error listing ticket:', error);
      throw error;
    }
  };

  // Example function to buy ticket
  const buyTicket = async (listingId: string) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    
    try {
      console.log('Buying ticket:', listingId);
      // Implementation would go here based on your IDL's buy_ticket instruction
    } catch (error) {
      console.error('Error buying ticket:', error);
      throw error;
    }
  };

  return {
    program,
    wallet,
    connection,
    connected: !!wallet,
    // Program interaction methods
    createEvent,
    mintTicket,
    listTicket,
    buyTicket,
  };
}