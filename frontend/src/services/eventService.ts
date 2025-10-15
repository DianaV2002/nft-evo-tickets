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
  ticketsSold: number;
  ticketSupply: number;
  version: number;
  coverImageUrl: string;
  bump: number;
}

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];
const TICKET_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 155]; // Different discriminator for tickets

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

    console.log(`Found ${accounts.length} event accounts`);

    const events: EventData[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;
        const dataLength = data.length;

        // Check if we have enough data for the basic structure
        if (dataLength < 8) {
          console.warn(`Account ${account.pubkey.toString()} has insufficient data`);
          continue;
        }

        // Skip discriminator (8 bytes)
        let offset = 8;

        // Read authority (32 bytes)
        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for authority`);
          continue;
        }
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Read scanner (32 bytes)
        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for scanner`);
          continue;
        }
        const scanner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Read event_id (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for event_id`);
          continue;
        }
        const eventId = data.readBigUInt64LE(offset);
        offset += 8;

        // Read name length (4 bytes) and name
        if (offset + 4 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for name length`);
          continue;
        }
        const nameLength = data.readUInt32LE(offset);
        offset += 4;

        if (nameLength > 64 || offset + nameLength > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} invalid name length: ${nameLength}`);
          continue;
        }
        const name = data.slice(offset, offset + nameLength).toString("utf-8");
        offset += nameLength;

        // Read start_ts (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for start_ts`);
          continue;
        }
        const startTs = Number(data.readBigInt64LE(offset));
        offset += 8;

        // Read end_ts (8 bytes)
        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for end_ts`);
          continue;
        }
        const endTs = Number(data.readBigInt64LE(offset));
        offset += 8;

        // Try to read tickets_sold (4 bytes) - default to 0 if not present or invalid
        let ticketsSold = 0;
        if (offset + 4 <= dataLength) {
          const rawTicketsSold = data.readUInt32LE(offset);
          // Only use the value if it seems reasonable (not corrupted data)
          if (rawTicketsSold < 1000000) {
            ticketsSold = rawTicketsSold;
          }
          offset += 4;
        } else {
          console.log(`Account ${account.pubkey.toString()} is an old event, using default tickets_sold=0`);
        }

        // Try to read ticket_supply (4 bytes) - default to 100 if not present or invalid
        let ticketSupply = 100;
        if (offset + 4 <= dataLength) {
          const rawTicketSupply = data.readUInt32LE(offset);
          // Only use the value if it seems reasonable (not corrupted data or 0)
          if (rawTicketSupply > 0 && rawTicketSupply < 1000000) {
            ticketSupply = rawTicketSupply;
          }
          offset += 4;
        } else {
          console.log(`Account ${account.pubkey.toString()} is an old event, using default ticket_supply=100`);
        }

        // Try to read version (1 byte) - default to 0 if not present
        let version = 0;
        if (offset + 1 <= dataLength) {
          version = data.readUInt8(offset);
          offset += 1;
        }

        // Try to read cover_image_url (String with length prefix)
        let coverImageUrl = "";
        if (offset + 4 <= dataLength) {
          const coverImageUrlLength = data.readUInt32LE(offset);
          offset += 4;
          if (coverImageUrlLength > 0 && coverImageUrlLength <= 200 && offset + coverImageUrlLength <= dataLength) {
            coverImageUrl = data.slice(offset, offset + coverImageUrlLength).toString("utf-8");
            offset += coverImageUrlLength;
          }
        }

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
          ticketsSold,
          ticketSupply,
          version,
          coverImageUrl,
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

    // Filter to show only version 2 events (clean events)
    const version2Events = activeEvents.filter(event => event.version === 2);

    // Deduplicate events based on name, organizer, and timing
    // Keep the most recent event if there are duplicates
    const uniqueEvents = new Map<string, EventData>();

    version2Events.forEach(event => {
      const key = `${event.name}-${event.authority}`;
      const existing = uniqueEvents.get(key);
      if (!existing || event.startTs > existing.startTs) {
        uniqueEvents.set(key, event);
      }
    });

    return Array.from(uniqueEvents.values());
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

async function fetchRealTicketData(
  connection: Connection,
  eventPublicKey: string
): Promise<{ ticketsSold: number; ticketSupply: number }> {
  try {
    console.log(`Fetching real ticket data for event: ${eventPublicKey}`);
    
    const ticketFilters = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
        },
      },
      {
        memcmp: {
          offset: 8,
          bytes: new PublicKey(eventPublicKey).toBase58(),
        },
      },
    ];

    const ticketAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: ticketFilters,
    });

    console.log(`Found ${ticketAccounts.length} ticket accounts for event ${eventPublicKey}`);

    // Get the event account to find the ticket supply
    const eventAccount = await connection.getAccountInfo(new PublicKey(eventPublicKey));
    let ticketSupply = 100; // Default value

    if (eventAccount && eventAccount.data.length >= 8) {
      const data = eventAccount.data;
      let offset = 8; // Skip discriminator
      offset += 32; // Skip authority
      offset += 32; // Skip scanner
      offset += 8; // Skip event_id
      
      // Read name length and skip name
      if (offset + 4 <= data.length) {
        const nameLength = data.readUInt32LE(offset);
        offset += 4 + nameLength;
      }
      
      offset += 8; // Skip start_ts
      offset += 8; // Skip end_ts
      offset += 4; // Skip tickets_sold
      
      // Read ticket_supply
      if (offset + 4 <= data.length) {
        const rawTicketSupply = data.readUInt32LE(offset);
        if (rawTicketSupply > 0 && rawTicketSupply < 1000000) {
          ticketSupply = rawTicketSupply;
        }
      }
    }

    return {
      ticketsSold: ticketAccounts.length,
      ticketSupply
    };
  } catch (error) {
    console.error(`Error fetching real ticket data for event ${eventPublicKey}:`, error);
    return {
      ticketsSold: 0,
      ticketSupply: 100
    };
  }
}

export async function getEventTicketStats(
  connection: Connection,
  eventPublicKey: string
): Promise<{
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  soldPercentage: number;
}> {
  try {
    const realTicketData = await fetchRealTicketData(connection, eventPublicKey);
    const ticketsAvailable = Math.max(0, realTicketData.ticketSupply - realTicketData.ticketsSold);
    const soldPercentage = realTicketData.ticketSupply > 0 
      ? Math.round((realTicketData.ticketsSold / realTicketData.ticketSupply) * 100)
      : 0;

    return {
      totalTickets: realTicketData.ticketSupply,
      ticketsSold: realTicketData.ticketsSold,
      ticketsAvailable,
      soldPercentage
    };
  } catch (error) {
    console.error(`Error getting ticket stats for event ${eventPublicKey}:`, error);
    return {
      totalTickets: 100,
      ticketsSold: 0,
      ticketsAvailable: 100,
      soldPercentage: 0
    };
  }
}

export async function fetchEventsByKeys(
  connection: Connection,
  eventKeys: string[]
): Promise<Map<string, EventData>> {
  const eventsMap = new Map<string, EventData>();

  try {
    console.log(`Fetching ${eventKeys.length} specific events...`);

    const promises = eventKeys.map(async (eventKey) => {
      try {
        const publicKey = new PublicKey(eventKey);
        const accountInfo = await connection.getAccountInfo(publicKey);

        if (!accountInfo || accountInfo.owner.toString() !== PROGRAM_ID.toString()) {
          console.warn(`Event ${eventKey} not found or invalid owner`);
          return null;
        }

        const data = accountInfo.data;
        let offset = 8;

        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const scanner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const eventId = data.readBigUInt64LE(offset);
        offset += 8;

        const nameLength = data.readUInt32LE(offset);
        offset += 4;

        if (nameLength > 1000 || offset + nameLength > data.length) {
          console.warn(`Invalid name length for event ${eventKey}`);
          return null;
        }

        const name = data.slice(offset, offset + nameLength).toString("utf-8");
        offset += nameLength;

        const startTs = data.readBigInt64LE(offset);
        offset += 8;

        const endTs = data.readBigInt64LE(offset);
        offset += 8;

        // Try to read tickets_sold (4 bytes) - default to 0 if not present or invalid
        let ticketsSold = 0;
        if (offset + 4 <= data.length) {
          const rawTicketsSold = data.readUInt32LE(offset);
          if (rawTicketsSold < 1000000) {
            ticketsSold = rawTicketsSold;
          }
          offset += 4;
        }

        // Try to read ticket_supply (4 bytes) - default to 100 if not present or invalid
        let ticketSupply = 100;
        if (offset + 4 <= data.length) {
          const rawTicketSupply = data.readUInt32LE(offset);
          if (rawTicketSupply > 0 && rawTicketSupply < 1000000) {
            ticketSupply = rawTicketSupply;
          }
          offset += 4;
        }

        // Try to read version (1 byte) - default to 0 if not present
        let version = 0;
        if (offset + 1 <= data.length) {
          version = data.readUInt8(offset);
          offset += 1;
        }

        // Try to read cover_image_url (String with length prefix)
        let coverImageUrl = "";
        if (offset + 4 <= data.length) {
          const coverImageUrlLength = data.readUInt32LE(offset);
          offset += 4;
          if (coverImageUrlLength > 0 && coverImageUrlLength <= 200 && offset + coverImageUrlLength <= data.length) {
            coverImageUrl = data.slice(offset, offset + coverImageUrlLength).toString("utf-8");
            offset += coverImageUrlLength;
          }
        }

        // Check if we have enough data for bump (1 byte)
        if (offset + 1 > data.length) {
          console.warn(`Account ${eventKey} insufficient data for bump at offset ${offset}`);
          return null;
        }
        const bump = data.readUInt8(offset);

        const eventData: EventData = {
          publicKey: eventKey,
          authority: authority.toString(),
          scanner: scanner.toString(),
          eventId: eventId.toString(),
          name,
          startTs: Number(startTs),
          endTs: Number(endTs),
          ticketsSold,
          ticketSupply,
          version,
          coverImageUrl,
          bump,
        };

        return { key: eventKey, data: eventData };
      } catch (error) {
        console.error(`Error processing event ${eventKey}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    results.forEach((result) => {
      if (result) {
        eventsMap.set(result.key, result.data);
      }
    });

    console.log(`Successfully fetched ${eventsMap.size} events`);
  } catch (error) {
    console.error("Error fetching events by keys:", error);
  }

  return eventsMap;
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
  if (!timestamp || timestamp <= 0) {
    return "Invalid date";
  }

  const date = new Date(timestamp * 1000);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

export function formatEventTime(startTs: number, endTs: number): string {
  const start = new Date(startTs * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Date(endTs * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
}

export interface CreateEventParams {
  name: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  ticketSupply: number;
  coverPhoto?: File | null;
}

export async function deleteEvent(
  connection: Connection,
  wallet: any,
  eventPublicKey: PublicKey,
  eventId: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  console.log("Deleting event:", {
    eventId,
    eventPda: eventPublicKey.toString(),
  });

  try {
    const { BN } = await import("@coral-xyz/anchor");
    const eventIdBN = new BN(eventId);

    const tx = await program.methods
      .deleteEvent(eventIdBN)
      .accounts({
        authority: wallet.publicKey,
        eventAccount: eventPublicKey,
      })
      .rpc();

    console.log("Event deleted! Transaction:", tx);

    return tx;
  } catch (error: any) {
    console.error("Error deleting event:", error);
    throw error;
  }
}

export async function createEvent(
  connection: Connection,
  wallet: any,
  params: CreateEventParams
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  let coverImageUrl = "";
  if (params.coverPhoto) {
    console.log("Uploading cover photo:", params.coverPhoto.name, "Size:", params.coverPhoto.size);
    const { uploadEventImage } = await import("./imageService");
    coverImageUrl = await uploadEventImage(params.coverPhoto);
    console.log("Cover image URL:", coverImageUrl || "(placeholder)");
  }

  const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  const eventId = new BN(Date.now() + Math.floor(Math.random() * 10000));

  const startTs = new BN(Math.floor(params.startDate.getTime() / 1000));
  const endTs = new BN(Math.floor(params.endDate.getTime() / 1000));

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
    const existingEvents = await fetchAllEvents(connection, wallet.publicKey);
    const duplicateEvent = existingEvents.find(event => 
      event.name === params.name && 
      event.authority === wallet.publicKey.toString()
    );
    
    if (duplicateEvent) {
      throw new Error(`An event with the name "${params.name}" already exists. Please choose a different name.`);
    }
  } catch (error) {
    console.warn("Could not check for duplicate events:", error);
  }

  try {
    const tx = await program.methods
      .createEvent(
        eventId,
        params.name,
        startTs,
        endTs,
        new BN(params.ticketSupply),
        coverImageUrl || ""
      )
      .accounts({
        organizer: wallet.publicKey,
        eventAccount: eventPda,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Event created! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error creating event:", error);
    
    // If the error is due to account already existing, try with a different event ID
    if (error.message?.includes("already in use") || error.message?.includes("AccountAlreadyExists")) {
      console.log("Event account already exists, retrying with new ID...");
      
      const retryEventId = new BN(Date.now() + Math.floor(Math.random() * 10000) + 1);
      const [retryEventPda] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft-evo-tickets"),
          Buffer.from("event"),
          retryEventId.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      const tx = await program.methods
        .createEvent(
          retryEventId,
          params.name,
          startTs,
          endTs,
          new BN(params.ticketSupply),
          coverImageUrl || ""
        )
        .accounts({
          organizer: wallet.publicKey,
          eventAccount: retryEventPda,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Event created on retry! Transaction:", tx);
      return tx;
    }

    throw error;
  }
}

export async function updateEvent(
  connection: web3.Connection,
  wallet: any,
  eventId: number,
  params: {
    name: string
    startTs: number
    endTs: number
    ticketSupply: number
    coverImageUrl: string
  }
): Promise<string> {
  try {
    const program = new Program(idl.default as any, new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })) as any

    const eventIdBN = new BN(eventId)
    const [eventPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft-evo-tickets"),
        Buffer.from("event"),
        eventIdBN.toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    )

    const startTs = new BN(params.startTs)
    const endTs = new BN(params.endTs)

    const tx = await program.methods
      .updateEvent(
        eventIdBN,
        params.name,
        startTs,
        endTs,
        new BN(params.ticketSupply),
        params.coverImageUrl
      )
      .accounts({
        authority: wallet.publicKey,
        eventAccount: eventPda,
      })
      .rpc();

    console.log("Event updated! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error updating event:", error);
    throw error;
  }
}
