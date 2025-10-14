import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const idlPath = path.join(__dirname, "../target/idl/nft_evo_tickets.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];

async function main() {
  console.log("🔍 Checking events in the system");
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(EVENT_DISCRIMINATOR)),
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
  });

  console.log(`✅ Total events found: ${accounts.length}\n`);

  if (accounts.length > 0) {
    console.log("Event Details:");
    console.log("=".repeat(80));

    accounts.forEach((account, i) => {
      const data = account.account.data;

      let offset = 8; // Skip discriminator

      const authority = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const scanner = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const eventId = data.readBigUInt64LE(offset);
      offset += 8;

      // Parse name (String with length prefix)
      const nameLen = data.readUInt32LE(offset);
      offset += 4;
      const name = data.slice(offset, offset + nameLen).toString('utf8');
      offset += 64; // Name is max 64 bytes

      const startTs = data.readBigInt64LE(offset);
      offset += 8;

      const endTs = data.readBigInt64LE(offset);
      offset += 8;

      const ticketsSold = data.readUInt32LE(offset);
      offset += 4;

      const ticketSupply = data.readUInt32LE(offset);
      offset += 4;

      console.log(`\n${i + 1}. ${name}`);
      console.log(`   Account: ${account.pubkey.toString()}`);
      console.log(`   Event ID: ${eventId}`);
      console.log(`   Authority: ${authority}`);
      console.log(`   Start: ${new Date(Number(startTs) * 1000).toLocaleString()}`);
      console.log(`   End: ${new Date(Number(endTs) * 1000).toLocaleString()}`);
      console.log(`   Tickets: ${ticketsSold} / ${ticketSupply}`);
    });
  } else {
    console.log("❌ No events found in the system");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
