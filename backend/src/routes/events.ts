import * as express from 'express';
import { Request, Response } from 'express';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, BN, Program, web3 } from '@coral-xyz/anchor';
import { getUserByWalletAddress } from '../authService';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load the IDL
let idl: any;
let program: Program;
try {
  const idlPath = path.join(__dirname, '../../../target/idl/nft_evo_tickets.json');
  const idlFile = fs.readFileSync(idlPath, 'utf8');
  idl = JSON.parse(idlFile);
  console.log('IDL loaded successfully');
} catch (error) {
  console.error('Failed to load IDL:', error);
  idl = null;
}

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { walletAddress, name, startDate, endDate, ticketSupply, coverPhotoUrl } = req.body;

    // Validate required fields
    if (!walletAddress || !name || !startDate || !endDate || !ticketSupply) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'walletAddress, name, startDate, endDate, and ticketSupply are required'
      });
    }

    // Validate name length and characters
    if (!name || name.length < 1 || name.length > 100) {
      return res.status(400).json({ 
        error: 'Invalid event name',
        details: 'Event name must be 1-100 characters'
      });
    }

    // Get user authentication data
    const userAuth = getUserByWalletAddress(walletAddress);
    if (!userAuth) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userAuth.authMethod === 'wallet') {
      return res.status(400).json({ error: 'This endpoint is for email/social users only' });
    }

    if (!userAuth.keypair) {
      return res.status(400).json({ error: 'User keypair not available' });
    }

    // Create a mock wallet object for the event service
    const mockWallet = {
      publicKey: userAuth.publicKey,
      signTransaction: async (transaction: any) => {
        transaction.sign(userAuth.keypair!);
        return transaction;
      },
      signAllTransactions: async (transactions: any[]) => {
        transactions.forEach(transaction => transaction.sign(userAuth.keypair!));
        return transactions;
      }
    };

    // Create event using Anchor program directly
    const provider = new AnchorProvider(connection, mockWallet, { commitment: "confirmed" });
    
    if (!idl) {
      return res.status(500).json({ error: 'IDL not loaded' });
    }

    // Initialize the program
    const programId = new PublicKey(idl.address);
    program = new Program(idl, provider);

    // Generate event ID and timestamps
    const eventId = new BN(Date.now() + Math.floor(Math.random() * 10000));
    const startTs = new BN(Math.floor(new Date(startDate).getTime() / 1000));
    const endTs = new BN(Math.floor(new Date(endDate).getTime() / 1000));

    // Find the event account PDA
    const [eventAccountPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('nft-evo-tickets'),
        Buffer.from('event'),
        eventId.toArrayLike(Buffer, 'le', 8)
      ],
      programId
    );

    console.log('Creating event with:', {
      eventId: eventId.toString(),
      name,
      startTs: startTs.toString(),
      endTs: endTs.toString(),
      ticketSupply,
      capacity: ticketSupply, // Use ticketSupply as capacity
      coverImageUrl: coverPhotoUrl || '',
      eventAccountPDA: eventAccountPDA.toString()
    });

    // Create the event on blockchain
    let tx: string;
    try {
      tx = await program.methods
        .createEvent(
          eventId,
          name,
          startTs,
          endTs,
          ticketSupply,
          ticketSupply, // capacity = ticketSupply
          coverPhotoUrl || ''
        )
        .accounts({
          organizer: userAuth.publicKey,
          eventAccount: eventAccountPDA,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      console.log('Event created successfully:', tx);
    } catch (error: any) {
      console.error('Transaction failed:', error);
      
      // Check if it's a balance issue
      if (error.message && error.message.includes('debit an account but found no record of a prior credit')) {
        return res.status(400).json({
          error: 'Insufficient SOL balance',
          details: 'Your wallet needs SOL to pay for transaction fees. Please visit https://faucet.solana.com to get test SOL.',
          walletAddress: walletAddress
        });
      }
      
      // Re-throw other errors
      throw error;
    }

    res.json({
      success: true,
      transactionSignature: tx,
      eventName: name,
      walletAddress: walletAddress,
      eventId: eventId.toString(),
      eventAccountPDA: eventAccountPDA.toString()
    });

  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

export default router;
