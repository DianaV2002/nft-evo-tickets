import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../anchor-idl/nft_evo_tickets.json";

export interface EventData {
  publicKey: string;
  authority: string;
  scanner: string;
  eventId: string;
  name: string;
  startTs: number;
  endTs: number;
  bump: number;
}

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];

export async function fetchAllEvents(
  connection: Connection,
  authorityFilter?: PublicKey
): Promise<EventData[]> {
  try {
    // Build filters for fetching events
    const filters: any[] = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(EVENT_DISCRIMINATOR)),
        },
      },
    ];

    // If authority filter is provided, add it to filters
    if (authorityFilter) {
      filters.push({
        memcmp: {
          offset: 8, // After discriminator, authority starts at byte 8
          bytes: authorityFilter.toBase58(),
        },
      });
    }

    // Fetch all accounts owned by the program with the EventAccount discriminator
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });

    const events: EventData[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;
        const dataLength = data.length;
        
        // Debug: Log account info
        console.log(`Processing account ${account.pubkey.toString()}, data length: ${dataLength}`);
        
        // Check if we have enough data for the basic structure
        if (dataLength < 8) {
          console.warn(`Account ${account.pubkey.toString()} has insufficient data (${dataLength} bytes)`);
          continue;
        }
        
        // Log discriminator for debugging
        const discriminator = data.slice(0, 8);
        console.log(`Account ${account.pubkey.toString()} discriminator:`, discriminator.toString('hex'));
        
        let offset = 8; // Skip discriminator

        // Check if we have enough data for authority (32 bytes)
        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for authority at offset ${offset}`);
          continue;
        }
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Check if we have enough data for scanner (32 bytes)
        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for scanner at offset ${offset}`);
          continue;
        }
        const scanner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Check if we have enough data for event_id (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for event_id at offset ${offset}`);
          continue;
        }
        const eventId = data.readBigUInt64LE(offset);
        offset += 8;

        // Check if we have enough data for name length (4 bytes)
        if (offset + 4 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for name length at offset ${offset}`);
          continue;
        }
        const nameLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Validate name length is reasonable and we have enough data
        if (nameLength > 1000 || offset + nameLength > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} invalid name length ${nameLength} at offset ${offset}, data length ${dataLength}`);
          continue;
        }
        const name = data.slice(offset, offset + nameLength).toString("utf-8");
        offset += nameLength;

        // Check if we have enough data for start_ts (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for start_ts at offset ${offset}`);
          continue;
        }
        const startTs = data.readBigInt64LE(offset);
        offset += 8;

        // Check if we have enough data for end_ts (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for end_ts at offset ${offset}`);
          continue;
        }
        const endTs = data.readBigInt64LE(offset);
        offset += 8;

        // Check if we have enough data for bump (1 byte)
        if (offset + 1 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for bump at offset ${offset}`);
          continue;
        }
        const bump = data.readUInt8(offset);

        const eventData = {
          publicKey: account.pubkey.toString(),
          authority: authority.toString(),
          scanner: scanner.toString(),
          eventId: eventId.toString(),
          name,
          startTs: Number(startTs),
          endTs: Number(endTs),
          bump,
        };
        
        // Debug: Log timestamp values
        console.log(`Event ${eventData.name}:`, {
          startTs: eventData.startTs,
          endTs: eventData.endTs,
          startDate: new Date(eventData.startTs * 1000),
          endDate: new Date(eventData.endTs * 1000)
        });
        
        events.push(eventData);
      } catch (err) {
        console.error(`Error decoding event account ${account.pubkey.toString()}:`, err);
      }
    }

    // Filter out past events (where end time has passed)
    const now = Math.floor(Date.now() / 1000);
    const activeEvents = events.filter(event => event.endTs > now);

    // Sort by start time (most recent first)
    activeEvents.sort((a, b) => b.startTs - a.startTs);

    return activeEvents;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export function getEventStatus(startTs: number, endTs: number): "upcoming" | "live" | "ended" {
  const now = Date.now() / 1000;

  if (now < startTs) {
    return "upcoming";
  } else if (now >= startTs && now <= endTs) {
    return "live";
  } else {
    return "ended";
  }
}

export function formatEventDate(timestamp: number): string {
  // Handle invalid timestamps
  if (!timestamp || timestamp < 0 || timestamp > 4102444800) { // Year 2100
    return "Invalid Date";
  }
  
  const date = new Date(timestamp * 1000);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEventTime(startTs: number, endTs: number): string {
  const start = new Date(startTs * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const end = new Date(endTs * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${start} - ${end}`;
}

export interface CreateEventParams {
  name: string;
  startDate: Date;
  endDate: Date;
}

export async function createEvent(
  connection: Connection,
  wallet: any,
  params: CreateEventParams
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

  // Create provider
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  // Create program instance
  const program = new Program(idl as any, provider);

  // Generate unique event ID from timestamp
  const eventId = new BN(Date.now());

  // Convert dates to Unix timestamps
  const startTs = new BN(Math.floor(params.startDate.getTime() / 1000));
  const endTs = new BN(Math.floor(params.endDate.getTime() / 1000));

  // Derive event PDA
  const [eventPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("nft-evo-tickets"),
      Buffer.from("event"),
      eventId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );

  console.log("Creating event:", {
    eventId: eventId.toString(),
    name: params.name,
    startTs: startTs.toString(),
    endTs: endTs.toString(),
    eventPda: eventPda.toString(),
  });

  try {
    // Call create_event instruction
    const tx = await program.methods
      .createEvent(eventId, params.name, startTs, endTs)
      .accounts({
        organizer: wallet.publicKey,
        eventAccount: eventPda,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Event created! Transaction:", tx);

    return tx;
  } catch (error: any) {
    // Check if the error is due to account already existing
    if (error?.message?.includes("already in use") ||
        error?.message?.includes("already been processed")) {
      // Add a small random offset to eventId and retry once
      const retryEventId = eventId.add(new BN(Math.floor(Math.random() * 1000)));

      const [retryEventPda] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft-evo-tickets"),
          Buffer.from("event"),
          retryEventId.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      console.log("Retrying with new event ID:", retryEventId.toString());

      const tx = await program.methods
        .createEvent(retryEventId, params.name, startTs, endTs)
        .accounts({
          organizer: wallet.publicKey,
          eventAccount: retryEventPda,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Event created on retry! Transaction:", tx);
      return tx;
    }

    // Re-throw other errors
    throw error;
  }
}
