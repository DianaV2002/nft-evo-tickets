import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NftEvoTickets } from '../target/types/nft_evo_tickets';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLUSTER = (process.env.SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || '2epW2RyDJZwUe3AahRSuKB2usqPzqm1qckPP7KPkLg3c');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '10kb' })); // Limit body size

// Initialize Solana connection and program
let program: anchor.Program<NftEvoTickets>;

async function initializeProgram() {
  const connection = new Connection(
    process.env.RPC_URL || clusterApiUrl(CLUSTER),
    'confirmed'
  );

  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const idl = JSON.parse(
    fs.readFileSync('./target/idl/nft_evo_tickets.json', 'utf-8')
  );

  program = new anchor.Program(idl, provider) as anchor.Program<NftEvoTickets>;
}

// Error handling middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    cluster: CLUSTER,
    timestamp: new Date().toISOString()
  });
});

// Get ticket status by public key
app.get(
  '/api/ticket/:publicKey',
  [
    param('publicKey')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid public key format'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { publicKey } = req.params;

    let ticketPubkey: PublicKey;
    try {
      ticketPubkey = new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key'
      });
    }

    try {
      const ticket = await program.account.ticketAccount.fetch(ticketPubkey);

      res.json({
        success: true,
        data: {
          publicKey: ticketPubkey.toString(),
          owner: ticket.owner.toString(),
          event: ticket.event.toString(),
          seat: ticket.seat || null,
          stage: getStageLabel(ticket.stage),
          isListed: ticket.isListed
        }
      });
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found'
        });
      }
      throw error;
    }
  })
);

// Get all tickets for an owner
app.get(
  '/api/owner/:publicKey/tickets',
  [
    param('publicKey')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid public key format'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { publicKey } = req.params;

    let ownerPubkey: PublicKey;
    try {
      ownerPubkey = new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key'
      });
    }

    const tickets = await program.account.ticketAccount.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator + event pubkey
          bytes: ownerPubkey.toBase58()
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        owner: ownerPubkey.toString(),
        count: tickets.length,
        tickets: tickets.map(ticket => ({
          publicKey: ticket.publicKey.toString(),
          seat: ticket.account.seat || null,
          stage: getStageLabel(ticket.account.stage),
          isListed: ticket.account.isListed,
          nftMint: ticket.account.nftMint.toString(),
          event: ticket.account.event.toString()
        }))
      }
    });
  })
);

// Get all active listings
app.get(
  '/api/listings',
  asyncHandler(async (req: Request, res: Response) => {
    const listings = await program.account.listingAccount.all();
    const now = Date.now() / 1000;

    res.json({
      success: true,
      data: {
        count: listings.length,
        listings: listings.map(listing => ({
          pda: listing.publicKey.toString(),
          ticket: listing.account.ticket.toString(),
          seller: listing.account.seller.toString(),
          priceSol: listing.account.priceLamports.toNumber() / 1e9,
          priceLamports: listing.account.priceLamports.toString(),
          createdAt: new Date(listing.account.createdAt.toNumber() * 1000).toISOString(),
          expiresAt: listing.account.expiresAt
            ? new Date(listing.account.expiresAt.toNumber() * 1000).toISOString()
            : null,
          isExpired: listing.account.expiresAt
            ? listing.account.expiresAt.toNumber() < now
            : false,
          isActive: listing.account.expiresAt
            ? listing.account.expiresAt.toNumber() >= now
            : true
        }))
      }
    });
  })
);

// Get all tickets for an event
app.get(
  '/api/event/:publicKey/tickets',
  [
    param('publicKey')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid public key format'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { publicKey } = req.params;

    let eventPubkey: PublicKey;
    try {
      eventPubkey = new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key'
      });
    }

    const tickets = await program.account.ticketAccount.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: eventPubkey.toBase58()
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        event: eventPubkey.toString(),
        count: tickets.length,
        tickets: tickets.map(ticket => ({
          publicKey: ticket.publicKey.toString(),
          owner: ticket.account.owner.toString(),
          seat: ticket.account.seat || null,
          stage: getStageLabel(ticket.account.stage),
          isListed: ticket.account.isListed,
          nftMint: ticket.account.nftMint.toString()
        }))
      }
    });
  })
);

// Helper function
function getStageLabel(stage: any): string {
  if (stage.qr !== undefined || stage === 0) {
    return 'QR';
  }
  return 'Unknown';
}

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
async function start() {
  try {
    await initializeProgram();
    app.listen(PORT, () => {
      console.log(`🚀 Secure Ticket API running on port ${PORT}`);
      console.log(`📡 Cluster: ${CLUSTER}`);
      console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
      console.log(`\n📚 Endpoints:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /api/ticket/:publicKey`);
      console.log(`   GET  /api/owner/:publicKey/tickets`);
      console.log(`   GET  /api/event/:publicKey/tickets`);
      console.log(`   GET  /api/listings`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
