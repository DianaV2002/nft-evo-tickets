import * as express from 'express';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { getUserByWalletAddress } from '../authService';
import { validateEmail, handleValidationErrors } from '../utils/security';
import { body } from 'express-validator';
import { Request, Response } from 'express';

const router = express.Router();

// Program configuration
const PROGRAM_ID = new PublicKey('G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr');
const PROGRAM_SEED = 'nft-evo-tickets';
const TICKET_SEED = 'ticket';
const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SystemProgram = web3.SystemProgram;

// Load IDL
let idl: any;
try {
  idl = require('../../target/idl/nft_evo_tickets.json');
} catch (error) {
  console.warn('IDL not found, ticket purchase will not work');
}

// Validation middleware
const validateTicketPurchase = [
  body('walletAddress')
    .isString()
    .isLength({ min: 32, max: 44 })
    .withMessage('Valid wallet address required'),
  body('eventPublicKey')
    .isString()
    .isLength({ min: 32, max: 44 })
    .withMessage('Valid event public key required'),
  body('ticketPriceLamports')
    .isNumeric()
    .withMessage('Valid ticket price required'),
  body('seat')
    .optional()
    .isString()
    .withMessage('Seat must be a string'),
  handleValidationErrors
];


router.post('/purchase', validateTicketPurchase, async (req: Request, res: Response) => {
  try {
    const { walletAddress, eventPublicKey, ticketPriceLamports, seat } = req.body;
    
    // Get user authentication data
    const userAuth = getUserByWalletAddress(walletAddress);
    if (!userAuth) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Only allow email/social users (not wallet users)
    if (userAuth.authMethod === 'wallet') {
      return res.status(400).json({ error: 'This endpoint is for email/social users only' });
    }
    
    if (!userAuth.keypair) {
      return res.status(400).json({ error: 'User keypair not available' });
    }
    
    // Create connection
    const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!);
    
    // Create a mock wallet object for Anchor
    const mockWallet = {
      publicKey: userAuth.publicKey,
      signTransaction: async (tx: any) => {
        tx.sign(userAuth.keypair!);
        return tx;
      },
      signAllTransactions: async (txs: any[]) => {
        txs.forEach(tx => tx.sign(userAuth.keypair!));
        return txs;
      }
    };
    
    // Create Anchor provider
    const provider = new AnchorProvider(
      connection,
      mockWallet as any,
      {
        commitment: "confirmed",
        skipPreflight: false,
        preflightCommitment: "confirmed"
      }
    );
    
    const program = new Program(idl as any, provider);
    
    const eventPubKey = new PublicKey(eventPublicKey);
    const buyer = userAuth.publicKey;
    
    // Get event data
    const eventAccount = await (program.account as any).eventAccount.fetch(eventPubKey);
    const organizer = eventAccount.authority as PublicKey;
    
    // Generate unique ticket ID
    const ticketId = Date.now() + Math.floor(Math.random() * 1000000);
    const ticketIdBuffer = Buffer.alloc(8);
    ticketIdBuffer.writeBigUInt64LE(BigInt(ticketId));
    
    // Derive PDAs
    const [ticketPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(TICKET_SEED),
        eventPubKey.toBuffer(),
        buyer.toBuffer(),
        ticketIdBuffer,
      ],
      PROGRAM_ID
    );
    
    const [nftMintPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from("nft-mint"),
        eventPubKey.toBuffer(),
        buyer.toBuffer(),
        ticketIdBuffer,
      ],
      PROGRAM_ID
    );
    
    const [metadataPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    
    const [masterEditionPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    
    // Get buyer's token account
    const buyerTokenAccount = await getAssociatedTokenAddress(
      nftMintPda,
      buyer
    );
    
    console.log("[Backend] Purchasing ticket for email user:", {
      buyer: buyer.toString(),
      organizer: organizer.toString(),
      eventAccount: eventPubKey.toString(),
      ticketAccount: ticketPda.toString(),
      nftMint: nftMintPda.toString(),
      ticketId: ticketId,
      price: `${ticketPriceLamports / 1e9} SOL`,
    });
    
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    
    // Execute the transaction
    const tx = await program.methods
      .buyEventTicket(new BN(ticketPriceLamports), seat || null, new BN(ticketId))
      .accounts({
        buyer: buyer,
        eventAccount: eventPubKey,
        organizer: organizer,
        ticketAccount: ticketPda,
        nftMint: nftMintPda,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        skipPreflight: false,
        maxRetries: 3,
      });
    
    await connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, "confirmed");
    
    console.log("[Backend] Ticket purchased successfully:", tx);
    
    res.json({
      success: true,
      transactionSignature: tx,
      explorerUrl: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      ticketId: ticketId,
      nftMint: nftMintPda.toString(),
      ticketAccount: ticketPda.toString()
    });
    
  } catch (error: any) {
    console.error("Error purchasing ticket:", error);
    res.status(500).json({ 
      error: 'Failed to purchase ticket',
      details: error.message 
    });
  }
});

export default router;
