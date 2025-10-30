import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import PinataClient from '@pinata/sdk';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getPinataClient, uploadImageToPinata } from './pinata';
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import eventRoutes from './routes/events';
import { securityHeaders, generalRateLimit } from './utils/security';
import { initializeAuthDatabase } from './database/authDb';

dotenv.config();

const requiredEnvVars = [
    'SOLANA_RPC_ENDPOINT',
    'PINATA_JWT',
    'PINATA_PRESTIGE_CID',
    'PINATA_QR_CID',
    'PINATA_SCANNED_CID',
    'PINATA_COLLECTIBLE_CID',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`[ERROR] Missing required environment variable: ${envVar}.`);
        console.error('Please create a .env file in the /backend directory and add all required variables.');
        process.exit(1); // Exit the process with an error code
    }
}

const app = express();

// Security middleware
app.use(helmet(securityHeaders));
app.use(rateLimit(generalRateLimit));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Backend is working!' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Ticket routes
app.use('/api/tickets', ticketRoutes);

// Event routes
app.use('/api/events', eventRoutes);

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT!;
const connection = new Connection(SOLANA_RPC_ENDPOINT);
const provider = new AnchorProvider(connection, {} as any, AnchorProvider.defaultOptions());

// Temporarily commented out due to Anchor program issues
// import idl from '../../target/idl/nft_evo_tickets.json';
// const programId = new PublicKey(idl.address);
// const program = new Program(idl as any, programId, provider);


const PINATA_JWT = process.env.PINATA_JWT!;
const pinata = new PinataClient({ pinataJWTKey: PINATA_JWT });

const METADATA_CIDS = {
    prestige: process.env.PINATA_PRESTIGE_CID!,
    qr: process.env.PINATA_QR_CID!,
    scanned: process.env.PINATA_SCANNED_CID!,
    collectible: process.env.PINATA_COLLECTIBLE_CID!,
};


app.post('/api/upload-qr', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get Pinata client using JWT from environment
        const pinataClient = await getPinataClient(
            PINATA_JWT,
            process.env.PINATA_GATEWAY
        );

        // Upload image to Pinata
        const ipfsUrl = await uploadImageToPinata(
            pinataClient,
            req.file.buffer,
            req.file.originalname
        );

        res.json({ ipfsUrl });
    } catch (error) {
        console.error('Error uploading QR code:', error);
        res.status(500).json({ error: 'Failed to upload QR code to IPFS' });
    }
});

// Temporarily commented out due to Anchor program issues
app.post('/get-ticket-metadata', async (req, res) => {
    try {
        const { ticketPda, signature, message } = req.body;

        if (!ticketPda || !signature || !message) {
            return res.status(400).json({ error: 'Missing required parameters.' });
        }

        const ticketAccount = await program.account.ticketAccount.fetch(new PublicKey(ticketPda));
        const ownerPublicKey = ticketAccount.owner;

        // 1. Verify the signature
        const signatureBytes = bs58.decode(signature);
        const messageBytes = new TextEncoder().encode(message);
        const publicKeyBytes = ownerPublicKey.toBuffer();

        const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

        if (!isVerified) {
            return res.status(401).json({ error: 'Signature verification failed.' });
        }

        // 2. Determine the current stage and get the corresponding CID
        const stage = Object.keys(ticketAccount.stage)[0];
        const cid = METADATA_CIDS[stage];

        if (!cid) {
            return res.status(404).json({ error: `No metadata CID found for stage: ${stage}` });
        }

        // 3. Generate a temporary URL from Pinata
        const expiresIn = 10; // 10 seconds
        const tempUrl = await pinata.gateways.private.createAccessLink({
            cid,
            expires: expiresIn,
        });

        res.json({ temporaryUrl: tempUrl });

    } catch (error) {
        console.error('Error fetching ticket metadata:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

console.log('Initializing authentication database...');
initializeAuthDatabase();
console.log('Authentication database initialized successfully');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend service running on http://localhost:${PORT}`);
    console.log('Ensure you have a .env file with the following variables:');
    console.log('- SOLANA_RPC_ENDPOINT');
    console.log('- PINATA_JWT');
    console.log('- PINATA_PRESTIGE_CID');
    console.log('- PINATA_QR_CID');
    console.log('- PINATA_SCANNED_CID');
    console.log('- PINATA_COLLECTIBLE_CID');
});
