import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc");
const TICKET_DISCRIMINATOR = [231, 93, 13, 18, 239, 66, 21, 45];

async function fetchUserTickets(
  connection: Connection,
  ownerPublicKey: PublicKey
) {
  const filters: any[] = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
      },
    },
    {
      memcmp: {
        offset: 8 + 32,
        bytes: ownerPublicKey.toBase58(),
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
  });

  const eventSet = new Set<string>();

  for (const account of accounts) {
    const data = account.account.data;
    const event = new PublicKey(data.slice(8, 40));
    eventSet.add(event.toBase58());
  }

  return eventSet;
}

async function main() {
  console.log("\n🎯 Events You Have Tickets For");
  console.log("=".repeat(60));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");

  let walletKeypair: anchor.web3.Keypair;
  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    walletKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(walletData));
  } catch (err) {
    console.error("❌ Failed to load wallet");
    process.exit(1);
  }

  const walletPublicKey = walletKeypair.publicKey;
  console.log("👤 Wallet:", walletPublicKey.toBase58());
  console.log("");

  const eventsWithTickets = await fetchUserTickets(connection, walletPublicKey);

  if (eventsWithTickets.size === 0) {
    console.log("📭 No tickets found");
  } else {
    console.log(`📋 You have tickets for ${eventsWithTickets.size} event(s):\n`);
    Array.from(eventsWithTickets).forEach((eventKey, index) => {
      console.log(`${index + 1}. ${eventKey}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 To mint a new ticket, choose an event NOT in this list");
  console.log("✨ Done!\n");
}

main().catch(console.error);
