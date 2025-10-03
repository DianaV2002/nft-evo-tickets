import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import PinataClient from '@pinata/sdk';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

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
app.use(cors());
app.use(express.json());

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT!;
const connection = new Connection(SOLANA_RPC_ENDPOINT);
const provider = new AnchorProvider(connection, {} as any, AnchorProvider.defaultOptions());

import idl from '../../target/types/nft_evo_tickets.json';
const programId = new PublicKey(idl.metadata.address);
const program = new Program(idl as any, programId, provider);


const PINATA_JWT = process.env.PINATA_JWT!;
const pinata = new PinataClient({ pinataJWTKey: PINATA_JWT });

const METADATA_CIDS = {
    prestige: process.env.PINATA_PRESTIGE_CID!,
    qr: process.env.PINATA_QR_CID!,
    scanned: process.env.PINATA_SCANNED_CID!,
    collectible: process.env.PINATA_COLLECTIBLE_CID!,
};


/**
 * POST /get-ticket-metadata
 * Body: {
 *   ticketPda: string, // The public key of the ticket's PDA account
 *   signature: string, // The signature from the user's wallet
 *   message: string    // The message that was signed
 * }
 */
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
