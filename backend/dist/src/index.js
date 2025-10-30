"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@project-serum/anchor");
const sdk_1 = __importDefault(require("@pinata/sdk"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const pinata_1 = require("./pinata");
const auth_js_1 = __importDefault(require("./routes/auth.js"));
dotenv_1.default.config();
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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Auth routes
app.use('/api/auth', auth_js_1.default);
// Configure multer for file uploads
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT;
const connection = new web3_js_1.Connection(SOLANA_RPC_ENDPOINT);
const provider = new anchor_1.AnchorProvider(connection, {}, anchor_1.AnchorProvider.defaultOptions());
const nft_evo_tickets_json_1 = __importDefault(require("../../target/types/nft_evo_tickets.json"));
const programId = new web3_js_1.PublicKey(nft_evo_tickets_json_1.default.metadata.address);
const program = new anchor_1.Program(nft_evo_tickets_json_1.default, programId, provider);
const PINATA_JWT = process.env.PINATA_JWT;
const pinata = new sdk_1.default({ pinataJWTKey: PINATA_JWT });
const METADATA_CIDS = {
    prestige: process.env.PINATA_PRESTIGE_CID,
    qr: process.env.PINATA_QR_CID,
    scanned: process.env.PINATA_SCANNED_CID,
    collectible: process.env.PINATA_COLLECTIBLE_CID,
};
app.post('/api/upload-qr', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        // Get Pinata client using JWT from environment
        const pinataClient = yield (0, pinata_1.getPinataClient)(PINATA_JWT, process.env.PINATA_GATEWAY);
        // Upload image to Pinata
        const ipfsUrl = yield (0, pinata_1.uploadImageToPinata)(pinataClient, req.file.buffer, req.file.originalname);
        res.json({ ipfsUrl });
    }
    catch (error) {
        console.error('Error uploading QR code:', error);
        res.status(500).json({ error: 'Failed to upload QR code to IPFS' });
    }
}));
app.post('/get-ticket-metadata', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ticketPda, signature, message } = req.body;
        if (!ticketPda || !signature || !message) {
            return res.status(400).json({ error: 'Missing required parameters.' });
        }
        const ticketAccount = yield program.account.ticketAccount.fetch(new web3_js_1.PublicKey(ticketPda));
        const ownerPublicKey = ticketAccount.owner;
        // 1. Verify the signature
        const signatureBytes = bs58_1.default.decode(signature);
        const messageBytes = new TextEncoder().encode(message);
        const publicKeyBytes = ownerPublicKey.toBuffer();
        const isVerified = tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
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
        const tempUrl = yield pinata.gateways.private.createAccessLink({
            cid,
            expires: expiresIn,
        });
        res.json({ temporaryUrl: tempUrl });
    }
    catch (error) {
        console.error('Error fetching ticket metadata:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
}));
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
