import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import {
  createBurnInstruction,
  createCloseAccountInstruction,
  getAccount as getTokenAccount,           // optional helper
  getAccount,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load IDL dynamically
const idlPath = path.join(__dirname, "../target/idl/nft_evo_tickets.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = new PublicKey(idl.address);
const TICKET_DISCRIMINATOR = [231, 93, 13, 18, 239, 66, 21, 45]; // Correct TicketAccount discriminator from IDL

interface TicketAccount {
  publicKey: string;
  event: string;
  owner: string;
  nftMint: string;
  seat: string | null;
  stage: number;
  isListed: boolean;
  wasScanned: boolean;
  listingPrice: number | null;
  listingExpiresAt: number | null;
}

async function fetchUserTickets(
  connection: Connection,
  owner: PublicKey
): Promise<TicketAccount[]> {
  console.log("🔍 Fetching tickets for owner:", owner.toString());

  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
      },
    },
    {
      memcmp: {
        offset: 40, // After discriminator (8) + event (32), owner starts at byte 40
        bytes: owner.toBase58(),
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
  });

  console.log(`✅ Found ${accounts.length} ticket accounts`);

  const tickets: TicketAccount[] = accounts.map((account) => {
    const data = account.account.data;

    // Parse ticket data
    let offset = 8; // Skip discriminator

    const event = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    const ownerPubkey = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    const nftMint = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // Parse seat (Option<String>)
    const hasSeat = data[offset] === 1;
    offset += 1;
    let seat: string | null = null;
    if (hasSeat) {
      const seatLen = data.readUInt32LE(offset);
      offset += 4;
      seat = data.slice(offset, offset + seatLen).toString('utf8');
      offset += 32; // Seat is fixed 32 bytes
    } else {
      offset += 32; // Skip empty seat space
    }

    const stage = data[offset];
    offset += 1;

    const isListed = data[offset] === 1;
    offset += 1;

    const wasScanned = data[offset] === 1;
    offset += 1;

    return {
      publicKey: account.pubkey.toString(),
      event,
      owner: ownerPubkey,
      nftMint,
      seat,
      stage,
      isListed,
      wasScanned,
      listingPrice: null,
      listingExpiresAt: null,
    };
  });

  return tickets;
}

async function burnTicket(
  connection: Connection,
  wallet: any,
  ticketMint: PublicKey
): Promise<string> {
  console.log(`🔥 Burning ticket NFT: ${ticketMint.toString()}`);

  try {
    const tokenAccount = await getAssociatedTokenAddress(
      ticketMint,
      wallet.publicKey
    );

    // Burn the NFT (1 token, since NFTs have 0 decimals)
    const burnIx = createBurnInstruction(
      tokenAccount,
      ticketMint,
      wallet.publicKey,
      1, // amount to burn
      [],
      TOKEN_PROGRAM_ID
    );

    // Close the token account after burn
    const closeIx = createCloseAccountInstruction(
      tokenAccount,
      wallet.publicKey, // destination (where to send reclaimed rent)
      wallet.publicKey, // authority
      [],
      TOKEN_PROGRAM_ID
    );

    const tx = new anchor.web3.Transaction().add(burnIx, closeIx);

    const signature = await connection.sendTransaction(tx, [wallet.payer], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(signature, "confirmed");

    console.log(`✅ Ticket burned: ${signature}`);
    return signature;
  } catch (error: any) {
    console.error(`❌ Failed to burn ticket:`, error.message);
    if (error.getLogs) {
      console.error("Logs:", await error.getLogs());
    }
    throw error;
  }
}

async function main() {
  console.log("🔥 Burn All Tickets Script");
  console.log("=" .repeat(50));

  // Load keypair
  const keypairPath = path.join(
    process.env.HOME || "",
    ".config",
    "solana",
    "id.json"
  );

  if (!fs.existsSync(keypairPath)) {
    console.error("❌ Keypair not found at:", keypairPath);
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("👛 Wallet:", keypair.publicKey.toString());

  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const wallet = new anchor.Wallet(keypair);

  // Fetch all user tickets
  const tickets = await fetchUserTickets(connection, wallet.publicKey);

  if (tickets.length === 0) {
    console.log("✅ No tickets found to burn");
    return;
  }

  console.log(`\n📋 Found ${tickets.length} tickets to burn:\n`);
  tickets.forEach((ticket, i) => {
    console.log(`${i + 1}. NFT Mint: ${ticket.nftMint}`);
    console.log(`   Seat: ${ticket.seat || "N/A"}`);
    console.log(`   Stage: ${ticket.stage}`);
    console.log(`   Listed: ${ticket.isListed}`);
    console.log(`   Scanned: ${ticket.wasScanned}`);
    console.log("");
  });

  // Confirm before burning
  console.log("⚠️  WARNING: This will permanently burn all your tickets!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Burn all tickets
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    console.log(`\n[${i + 1}/${tickets.length}] Burning ticket ${ticket.nftMint.slice(0, 8)}...`);

    try {
      await burnTicket(connection, wallet, new PublicKey(ticket.nftMint));
      successCount++;
    } catch (error) {
      console.error(`Failed to burn ticket ${ticket.nftMint}`);
      failCount++;
    }

    // Small delay between transactions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Burn Complete!");
  console.log(`✅ Successfully burned: ${successCount} tickets`);
  console.log(`❌ Failed: ${failCount} tickets`);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
