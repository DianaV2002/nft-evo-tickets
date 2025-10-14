import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const idlPath = path.join(__dirname, "../target/idl/nft_evo_tickets.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];

interface EventAccount {
  publicKey: string;
  eventId: string;
  name: string;
  authority: string;
  startTs: number;
  endTs: number;
  ticketsSold: number;
  ticketSupply: number;
}

async function fetchUserEvents(
  connection: Connection,
  authority: PublicKey
): Promise<EventAccount[]> {
  console.log("🔍 Fetching events created by:", authority.toString());

  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(EVENT_DISCRIMINATOR)),
      },
    },
    {
      memcmp: {
        offset: 8, // After discriminator, authority starts at byte 8
        bytes: authority.toBase58(),
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
  });

  console.log(`✅ Found ${accounts.length} event accounts`);

  const events: EventAccount[] = [];

  for (const account of accounts) {
    try {
      const data = account.account.data;
      let offset = 8; // Skip discriminator

      const authorityPubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const scanner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const eventId = data.readBigUInt64LE(offset);
      offset += 8;

      const nameLength = data.readUInt32LE(offset);
      offset += 4;

      if (nameLength > 1000) {
        console.warn(`Skipping account with invalid name length: ${nameLength}`);
        continue;
      }

      const name = data.slice(offset, offset + nameLength).toString("utf-8");
      offset += nameLength;

      const startTs = data.readBigInt64LE(offset);
      offset += 8;

      const endTs = data.readBigInt64LE(offset);
      offset += 8;

      let ticketsSold = 0;
      let ticketSupply = 0;

      if (offset + 4 <= data.length) {
        const rawTicketsSold = data.readUInt32LE(offset);
        if (rawTicketsSold < 1000000) {
          ticketsSold = rawTicketsSold;
        }
        offset += 4;
      }

      if (offset + 4 <= data.length) {
        const rawTicketSupply = data.readUInt32LE(offset);
        if (rawTicketSupply > 0 && rawTicketSupply < 1000000) {
          ticketSupply = rawTicketSupply;
        }
        offset += 4;
      }

      events.push({
        publicKey: account.pubkey.toString(),
        eventId: eventId.toString(),
        name,
        authority: authorityPubkey.toString(),
        startTs: Number(startTs),
        endTs: Number(endTs),
        ticketsSold,
        ticketSupply,
      });
    } catch (err) {
      console.error(`Error parsing event ${account.pubkey.toString()}:`, err);
    }
  }

  return events;
}

async function deleteEvent(
  program: any,
  wallet: any,
  eventPublicKey: PublicKey,
  eventId: string
): Promise<string> {
  console.log(`🗑️  Deleting event ${eventId}: ${eventPublicKey.toString()}`);

  try {
    const tx = await program.methods
      .deleteEvent(new anchor.BN(eventId))
      .accounts({
        authority: wallet.publicKey,
        eventAccount: eventPublicKey,
      })
      .rpc();

    console.log(`✅ Event deleted: ${tx}`);
    return tx;
  } catch (error: any) {
    console.error(`❌ Failed to delete event:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🗑️  Delete All Events Script");
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

  // Setup program
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new anchor.Program(idl as any, provider);

  // Fetch all user events
  const events = await fetchUserEvents(connection, wallet.publicKey);

  if (events.length === 0) {
    console.log("✅ No events found to delete");
    return;
  }

  console.log(`\n📋 Found ${events.length} events to delete:\n`);
  events.forEach((event, i) => {
    const startDate = new Date(event.startTs * 1000);
    const endDate = new Date(event.endTs * 1000);

    console.log(`${i + 1}. ${event.name}`);
    console.log(`   Event ID: ${event.eventId}`);
    console.log(`   Account: ${event.publicKey}`);
    console.log(`   Start: ${startDate.toLocaleString()}`);
    console.log(`   End: ${endDate.toLocaleString()}`);
    console.log(`   Tickets: ${event.ticketsSold} / ${event.ticketSupply}`);
    console.log("");
  });

  // Confirm before deleting
  console.log("⚠️  WARNING: This will permanently delete all your events!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete all events
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n[${i + 1}/${events.length}] Deleting event: ${event.name}`);

    try {
      await deleteEvent(
        program,
        wallet,
        new PublicKey(event.publicKey),
        event.eventId
      );
      successCount++;
    } catch (error) {
      console.error(`Failed to delete event ${event.name}`);
      failCount++;
    }

    // Small delay between transactions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Deletion Complete!");
  console.log(`✅ Successfully deleted: ${successCount} events`);
  console.log(`❌ Failed: ${failCount} events`);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
