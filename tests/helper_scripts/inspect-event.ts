import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const EVENT_PUBKEY = "65Uv6ZMnP7owzsUVeZVBTpgxc6CMXhqaEqwGT45T5cmj";

async function checkEvent() {
  const accountInfo = await connection.getAccountInfo(new PublicKey(EVENT_PUBKEY));
  if (!accountInfo) {
    console.log("Account not found");
    return;
  }

  const data = accountInfo.data;
  console.log("Total data length:", data.length);

  let offset = 8; // Skip discriminator

  // Authority (32 bytes)
  offset += 32;

  // Scanner (32 bytes)
  offset += 32;

  // Event ID (8 bytes)
  offset += 8;

  // Name length (4 bytes)
  const nameLength = data.readUInt32LE(offset);
  offset += 4;
  console.log("Name length:", nameLength);

  // Name (variable)
  offset += nameLength;

  // Start timestamp (8 bytes)
  offset += 8;

  // End timestamp (8 bytes)
  offset += 8;

  console.log("Offset after end_ts:", offset);
  console.log("Remaining bytes:", data.length - offset);

  // Try to read tickets_sold (4 bytes)
  if (offset + 4 <= data.length) {
    const ticketsSold = data.readUInt32LE(offset);
    console.log("tickets_sold:", ticketsSold);
    offset += 4;
  } else {
    console.log("No tickets_sold field (old event)");
  }

  // Try to read ticket_supply (4 bytes)
  if (offset + 4 <= data.length) {
    const ticketSupply = data.readUInt32LE(offset);
    console.log("ticket_supply:", ticketSupply);
    offset += 4;
  } else {
    console.log("No ticket_supply field (old event)");
  }

  // Bump (1 byte)
  if (offset + 1 <= data.length) {
    const bump = data.readUInt8(offset);
    console.log("bump:", bump);
  }
}

checkEvent().catch(console.error);
