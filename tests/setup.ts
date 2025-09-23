import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

dotenv.config(); // Load environment variables first

// Use a different RPC endpoint to avoid rate limits
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());

export const provider = anchor.AnchorProvider.env();
export const bundlrKey = process.env.BUNDLR_SOLANA_SECRET_KEY_B58;
export const program = anchor.workspace.NftEvoTickets as anchor.Program<anchor.Idl>;

