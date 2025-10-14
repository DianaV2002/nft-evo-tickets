import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// Program ID
const PROGRAM_ID = new PublicKey("6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc");
const TICKET_DISCRIMINATOR = [231, 93, 13, 18, 239, 66, 21, 45]; // TicketAccount discriminator from IDL

interface TicketData {
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
  bump: number;
}

function getStageName(stage: number): string {
  switch (stage) {
    case 0: return "Prestige";
    case 1: return "QR Code";
    case 2: return "Scanned";
    case 3: return "Collectible";
    default: return "Unknown";
  }
}

function getStatus(ticket: TicketData): string {
  if (ticket.wasScanned) return "Used";
  if (ticket.isListed) return "Listed for Sale";
  return "Active";
}

async function fetchUserTickets(
  connection: Connection,
  ownerPublicKey: PublicKey
): Promise<TicketData[]> {
  console.log("\n🔍 Searching for tickets...");
  console.log("👤 Owner:", ownerPublicKey.toBase58());
  console.log("📦 Program ID:", PROGRAM_ID.toBase58());

  const filters: any[] = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
      },
    },
    {
      memcmp: {
        offset: 8 + 32, // After discriminator (8) and event pubkey (32), owner starts
        bytes: ownerPublicKey.toBase58(),
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
  });

  console.log(`\n✅ Found ${accounts.length} ticket account(s)\n`);

  const tickets: TicketData[] = [];

  for (const account of accounts) {
    try {
      const data = account.account.data;
      let offset = 8; // Skip discriminator

      // Event (32 bytes)
      const event = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Owner (32 bytes)
      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // NFT Mint (32 bytes)
      const nftMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Seat (Option<String>)
      const hasSeat = data.readUInt8(offset);
      offset += 1;
      let seat: string | null = null;
      if (hasSeat === 1) {
        const seatLength = data.readUInt32LE(offset);
        offset += 4;
        seat = data.slice(offset, offset + seatLength).toString("utf-8");
        offset += seatLength;
      }

      // Stage (1 byte enum)
      const stage = data.readUInt8(offset);
      offset += 1;

      // is_listed (bool, 1 byte)
      const isListed = data.readUInt8(offset) === 1;
      offset += 1;

      // was_scanned (bool, 1 byte)
      const wasScanned = data.readUInt8(offset) === 1;
      offset += 1;

      // listing_price (Option<u64>)
      const hasListingPrice = data.readUInt8(offset);
      offset += 1;
      let listingPrice: number | null = null;
      if (hasListingPrice === 1) {
        listingPrice = Number(data.readBigUInt64LE(offset));
        offset += 8;
      }

      // listing_expires_at (Option<i64>)
      const hasListingExpiresAt = data.readUInt8(offset);
      offset += 1;
      let listingExpiresAt: number | null = null;
      if (hasListingExpiresAt === 1) {
        listingExpiresAt = Number(data.readBigInt64LE(offset));
        offset += 8;
      }

      // bump (1 byte)
      const bump = data.readUInt8(offset);

      tickets.push({
        publicKey: account.pubkey.toString(),
        event: event.toString(),
        owner: owner.toString(),
        nftMint: nftMint.toString(),
        seat,
        stage,
        isListed,
        wasScanned,
        listingPrice,
        listingExpiresAt,
        bump,
      });
    } catch (err) {
      console.error(`❌ Error decoding ticket ${account.pubkey.toString()}:`, err);
    }
  }

  return tickets;
}

async function main() {
  console.log("\n NFT Ticket Checker");
  console.log("=".repeat(50));

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  console.log("🌐 Connected to Solana Devnet");

  // Load wallet from default location
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");

  let walletKeypair: anchor.web3.Keypair;
  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    walletKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(walletData));
  } catch (err) {
    console.error("❌ Failed to load wallet from:", walletPath);
    console.error("Make sure your Solana wallet is configured.");
    process.exit(1);
  }

  const walletPublicKey = walletKeypair.publicKey;

  // Fetch tickets
  const tickets = await fetchUserTickets(connection, walletPublicKey);

  // Display results
  if (tickets.length === 0) {
    console.log("📭 No tickets found for this wallet.");
    console.log("\n💡 To get tickets, you need to:");
    console.log("   1. Create an event");
    console.log("   2. Mint a ticket for that event");
    console.log("   3. Or buy a ticket from the marketplace");
  } else {
    console.log("🎉 Your Tickets:");
    console.log("=".repeat(50));

    tickets.forEach((ticket, index) => {
      console.log(`\n Ticket #${index + 1}`);
      console.log("─".repeat(50));
      console.log(`   Account:      ${ticket.publicKey}`);
      console.log(`   Event:        ${ticket.event}`);
      console.log(`   NFT Mint:     ${ticket.nftMint}`);
      console.log(`   Stage:        ${getStageName(ticket.stage)}`);
      console.log(`   Status:       ${getStatus(ticket)}`);
      console.log(`   Seat:         ${ticket.seat || "N/A"}`);
      console.log(`   Scanned:      ${ticket.wasScanned ? "Yes" : "No"}`);

      if (ticket.listingPrice) {
        console.log(`   Listed Price: ${ticket.listingPrice / 1e9} SOL`);
        if (ticket.listingExpiresAt) {
          const expiryDate = new Date(ticket.listingExpiresAt * 1000);
          console.log(`   Expires:      ${expiryDate.toLocaleString()}`);
        }
      }
    });

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Total: ${tickets.length} ticket(s)`);
  }

  console.log("\n✨ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
