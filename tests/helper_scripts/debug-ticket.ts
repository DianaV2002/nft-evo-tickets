import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc");
const TICKET_ACCOUNT = new PublicKey("BqZpQ7XGi3zphWfLUkso6QsZpK3a7G2qv7kiezZogbDV");

async function debugTicket() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("🔍 Debugging Ticket Account");
  console.log("=".repeat(60));
  console.log("Ticket Account:", TICKET_ACCOUNT.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  // Fetch the account
  const accountInfo = await connection.getAccountInfo(TICKET_ACCOUNT);

  if (!accountInfo) {
    console.log("❌ Account not found!");
    return;
  }

  console.log("\n✅ Account found!");
  console.log("Owner Program:", accountInfo.owner.toBase58());
  console.log("Data length:", accountInfo.data.length, "bytes");
  console.log("Lamports:", accountInfo.lamports);

  // Check if owner matches our program
  if (accountInfo.owner.toBase58() !== PROGRAM_ID.toBase58()) {
    console.log("⚠️  Account owner doesn't match expected program ID!");
    console.log("   Expected:", PROGRAM_ID.toBase58());
    console.log("   Got:", accountInfo.owner.toBase58());
  }

  const data = accountInfo.data;

  // Read discriminator
  console.log("\n📊 Parsing Account Data:");
  console.log("─".repeat(60));

  const discriminator = Array.from(data.slice(0, 8));
  console.log("Discriminator:", discriminator);
  console.log("Discriminator (hex):", discriminator.map(b => b.toString(16).padStart(2, '0')).join(' '));

  let offset = 8;

  // Event (32 bytes)
  const event = new PublicKey(data.slice(offset, offset + 32));
  console.log("Event:", event.toBase58());
  offset += 32;

  // Owner (32 bytes)
  const owner = new PublicKey(data.slice(offset, offset + 32));
  console.log("Owner:", owner.toBase58());
  offset += 32;

  // NFT Mint (32 bytes)
  const nftMint = new PublicKey(data.slice(offset, offset + 32));
  console.log("NFT Mint:", nftMint.toBase58());
  offset += 32;

  // Seat (Option<String>)
  const hasSeat = data.readUInt8(offset);
  offset += 1;
  console.log("Has Seat:", hasSeat === 1 ? "Yes" : "No");

  let seat: string | null = null;
  if (hasSeat === 1) {
    const seatLength = data.readUInt32LE(offset);
    offset += 4;
    seat = data.slice(offset, offset + seatLength).toString("utf-8");
    offset += seatLength;
    console.log("Seat:", seat);
  }

  // Stage (1 byte enum)
  const stage = data.readUInt8(offset);
  offset += 1;
  const stageName = ["Prestige", "QR", "Scanned", "Collectible"][stage] || "Unknown";
  console.log("Stage:", stage, `(${stageName})`);

  // is_listed (bool, 1 byte)
  const isListed = data.readUInt8(offset) === 1;
  offset += 1;
  console.log("Is Listed:", isListed);

  // was_scanned (bool, 1 byte)
  const wasScanned = data.readUInt8(offset) === 1;
  offset += 1;
  console.log("Was Scanned:", wasScanned);

  // listing_price (Option<u64>)
  const hasListingPrice = data.readUInt8(offset);
  offset += 1;
  let listingPrice: number | null = null;
  if (hasListingPrice === 1) {
    listingPrice = Number(data.readBigUInt64LE(offset));
    offset += 8;
    console.log("Listing Price:", listingPrice / 1e9, "SOL");
  } else {
    console.log("Listing Price: None");
  }

  // listing_expires_at (Option<i64>)
  const hasListingExpiresAt = data.readUInt8(offset);
  offset += 1;
  let listingExpiresAt: number | null = null;
  if (hasListingExpiresAt === 1) {
    listingExpiresAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const expiryDate = new Date(listingExpiresAt * 1000);
    console.log("Listing Expires At:", expiryDate.toLocaleString());
  } else {
    console.log("Listing Expires At: None");
  }

  // bump (1 byte)
  const bump = data.readUInt8(offset);
  console.log("Bump:", bump);

  console.log("\n" + "=".repeat(60));

  // Now test the filter
  console.log("\n🧪 Testing Filter Match:");
  console.log("─".repeat(60));

  const TICKET_DISCRIMINATOR = [103, 134, 228, 3, 204, 145, 55, 137];
  console.log("Expected discriminator:", TICKET_DISCRIMINATOR);
  console.log("Actual discriminator:  ", discriminator);
  console.log("Discriminator match:", JSON.stringify(discriminator) === JSON.stringify(TICKET_DISCRIMINATOR));

  // Test owner filter at offset 8 + 32 = 40
  const ownerAtOffset40 = new PublicKey(data.slice(40, 72));
  console.log("\nOwner at offset 40:", ownerAtOffset40.toBase58());
  console.log("Your wallet:", "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV");
  console.log("Owner matches your wallet:", ownerAtOffset40.toBase58() === "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV");

  console.log("\n✨ Done!");
}

debugTicket().catch(console.error);
