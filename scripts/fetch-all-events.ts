import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import idl from "../frontend/src/anchor-idl/nft_evo_tickets.json" with { type: "json" };

async function main() {
  const connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl("devnet"),
    "confirmed"
  );

  const programId = new anchor.web3.PublicKey(idl.address);

  // Read-only provider (no wallet needed for reading)
  const provider = new anchor.AnchorProvider(
    connection,
    {} as any,
    { commitment: "confirmed" }
  );

  const program = new Program(
    idl as any,
    provider
  );

  console.log("Program ID:", programId.toString());
  console.log("Fetching all EventAccount accounts...\n");

  try {
    // Get discriminator for EventAccount
    const discriminator = [98, 136, 32, 165, 133, 231, 243, 154];

    // Fetch all accounts owned by the program with the EventAccount discriminator
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor.utils.bytes.bs58.encode(Buffer.from(discriminator)),
          },
        },
      ],
    });

    console.log(`Found ${accounts.length} event(s):\n`);

    if (accounts.length === 0) {
      console.log("No events found on-chain.");
    } else {
      // Manual decoding of EventAccount:
      // discriminator: 8 bytes
      // authority: 32 bytes (pubkey)
      // event_id: 8 bytes (u64)
      // name: 4 bytes length + string
      // start_ts: 8 bytes (i64)
      // end_ts: 8 bytes (i64)
      // bump: 1 byte (u8)

      accounts.forEach((account, index) => {
        try {
          const data = account.account.data;
          let offset = 8; // Skip discriminator

          // Read authority (32 bytes)
          const authority = new anchor.web3.PublicKey(data.slice(offset, offset + 32));
          offset += 32;

          // Read event_id (8 bytes, little-endian u64)
          const eventId = data.readBigUInt64LE(offset);
          offset += 8;

          // Read name (4 bytes length + string)
          const nameLength = data.readUInt32LE(offset);
          offset += 4;
          const name = data.slice(offset, offset + nameLength).toString("utf-8");
          offset += nameLength;

          // Read start_ts (8 bytes, little-endian i64)
          const startTs = data.readBigInt64LE(offset);
          offset += 8;

          // Read end_ts (8 bytes, little-endian i64)
          const endTs = data.readBigInt64LE(offset);
          offset += 8;

          // Read bump (1 byte)
          const bump = data.readUInt8(offset);

          console.log(`Event #${index + 1}:`);
          console.log("  Address:", account.pubkey.toString());
          console.log("  Authority:", authority.toString());
          console.log("  Event ID:", eventId.toString());
          console.log("  Name:", name);
          console.log("  Start:", new Date(Number(startTs) * 1000).toISOString());
          console.log("  End:", new Date(Number(endTs) * 1000).toISOString());
          console.log("  Bump:", bump);
          console.log("");
        } catch (err) {
          console.log(`Event #${index + 1}: Error decoding - ${err}`);
        }
      });
    }
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
