import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load IDL dynamically
const idlPath = path.join(__dirname, "../target/idl/nft_evo_tickets.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = new PublicKey(idl.address);
const TICKET_DISCRIMINATOR = [126, 242, 14, 207, 109, 254, 228, 71];

async function main() {
  const walletAddress = "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV";
  const owner = new PublicKey(walletAddress);

  console.log("🔍 Checking tickets for wallet:", walletAddress);
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // First, let's check all ticket accounts without owner filter
  console.log("📋 Fetching ALL ticket accounts from program...");
  const allTicketFilters = [
    {
      memcmp: {
        offset: 0,
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
      },
    },
  ];

  const allAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: allTicketFilters,
  });

  console.log(`✅ Total ticket accounts in program: ${allAccounts.length}\n`);

  // Now check with owner filter
  console.log("📋 Fetching tickets owned by specified wallet...");
  const ownerFilters = [
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

  const userAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: ownerFilters,
  });

  console.log(`✅ Tickets owned by wallet: ${userAccounts.length}\n`);

  if (userAccounts.length > 0) {
    console.log("Ticket Details:");
    console.log("=".repeat(80));

    userAccounts.forEach((account, i) => {
      const data = account.account.data;

      let offset = 8; // Skip discriminator

      const event = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const ownerPubkey = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const nftMint = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      // Parse seat
      const hasSeat = data[offset] === 1;
      offset += 1;
      let seat: string | null = null;
      if (hasSeat) {
        const seatLen = data.readUInt32LE(offset);
        offset += 4;
        seat = data.slice(offset, offset + seatLen).toString('utf8');
      }

      console.log(`\n${i + 1}. Account: ${account.pubkey.toString()}`);
      console.log(`   Event: ${event}`);
      console.log(`   Owner: ${ownerPubkey}`);
      console.log(`   NFT Mint: ${nftMint}`);
      console.log(`   Seat: ${seat || "N/A"}`);
    });
  } else {
    console.log("No tickets found for this wallet.");
  }

  // Let's also check if there are any tickets at all and who owns them
  if (allAccounts.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("Sample of other tickets in the system:");
    console.log("=".repeat(80));

    allAccounts.slice(0, 5).forEach((account, i) => {
      const data = account.account.data;

      let offset = 8; // Skip discriminator

      const event = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const ownerPubkey = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      const nftMint = new PublicKey(data.slice(offset, offset + 32)).toString();

      console.log(`\n${i + 1}. Account: ${account.pubkey.toString()}`);
      console.log(`   Event: ${event}`);
      console.log(`   Owner: ${ownerPubkey}`);
      console.log(`   NFT Mint: ${nftMint}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
