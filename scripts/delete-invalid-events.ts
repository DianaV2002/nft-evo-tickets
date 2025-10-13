import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import os from "os";

const idl = JSON.parse(fs.readFileSync("./target/idl/nft_evo_tickets.json", "utf-8"));

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];

interface EventData {
  publicKey: string;
  authority: string;
  eventId: string;
  name: string;
  ticketsSold: number;
  ticketSupply: number;
}

async function main() {
  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("🔍 Scanning for events with invalid ticket supply...");
  console.log("Wallet:", wallet.publicKey.toString());

  // Fetch all events
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(EVENT_DISCRIMINATOR)),
        },
      },
    ],
  });

  console.log(`Found ${accounts.length} total events`);

  const invalidEvents: EventData[] = [];

  for (const account of accounts) {
    try {
      const data = account.account.data;
      let offset = 8; // Skip discriminator

      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const scanner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const eventId = data.readBigUInt64LE(offset);
      offset += 8;

      const nameLength = data.readUInt32LE(offset);
      offset += 4;

      if (nameLength > 1000 || offset + nameLength > data.length) {
        console.warn(`Skipping event with invalid name length: ${account.pubkey.toString()}`);
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
        ticketsSold = data.readUInt32LE(offset);
        offset += 4;
      }

      if (offset + 4 <= data.length) {
        ticketSupply = data.readUInt32LE(offset);
        offset += 4;
      }

      // Check if event has invalid ticket supply
      if (ticketSupply === 0) {
        invalidEvents.push({
          publicKey: account.pubkey.toString(),
          authority: authority.toString(),
          eventId: eventId.toString(),
          name,
          ticketsSold,
          ticketSupply,
        });
      }
    } catch (err) {
      console.error(`Error processing account ${account.pubkey.toString()}:`, err);
    }
  }

  console.log(`\n📋 Found ${invalidEvents.length} events with invalid ticket supply (ticketSupply = 0):\n`);

  if (invalidEvents.length === 0) {
    console.log("✅ No invalid events found!");
    return;
  }

  // Display invalid events
  for (const event of invalidEvents) {
    console.log(`Event: ${event.name}`);
    console.log(`  ID: ${event.eventId}`);
    console.log(`  Public Key: ${event.publicKey}`);
    console.log(`  Authority: ${event.authority}`);
    console.log(`  Tickets Sold: ${event.ticketsSold}`);
    console.log(`  Ticket Supply: ${event.ticketSupply}`);
    console.log(`  Can Delete: ${event.authority === wallet.publicKey.toString() ? "YES (FORCED)" : "NO"}`);
    console.log("");
  }

  // Filter events that can be deleted (authority matches - FORCED deletion ignoring tickets sold)
  const deletableEvents = invalidEvents.filter(
    (event) => event.authority === wallet.publicKey.toString()
  );

  if (deletableEvents.length === 0) {
    console.log("⚠️  No events can be deleted (you must be the authority)");
    return;
  }

  console.log(`\n🗑️  Attempting to delete ${deletableEvents.length} events...\n`);

  // Create provider and program
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  const program = new anchor.Program(idl as any, provider);

  let successCount = 0;
  let failCount = 0;

  for (const event of deletableEvents) {
    try {
      console.log(`Deleting event: ${event.name} (${event.eventId})...`);

      const tx = await program.methods
        .deleteLegacyEvent()
        .accounts({
          authority: wallet.publicKey,
          eventAccount: new PublicKey(event.publicKey),
        })
        .rpc();

      console.log(`  ✅ Deleted! Transaction: ${tx}`);
      successCount++;
    } catch (error: any) {
      console.error(`  ❌ Failed to delete: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total invalid events: ${invalidEvents.length}`);
  console.log(`  Successfully deleted: ${successCount}`);
  console.log(`  Failed to delete: ${failCount}`);
  console.log(`  Cannot delete (not authority): ${invalidEvents.length - deletableEvents.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
