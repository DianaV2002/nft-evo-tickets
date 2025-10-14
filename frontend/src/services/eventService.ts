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

    const events: EventData[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;
        const dataLength = data.length;
        
        console.log(`Processing account ${account.pubkey.toString()}, data length: ${dataLength}`);
        
        if (dataLength < 8) {
          console.warn(`Account ${account.pubkey.toString()} has insufficient data (${dataLength} bytes)`);
          continue;
        }
        
        const discriminator = data.slice(0, 8);
        console.log(`Account ${account.pubkey.toString()} discriminator:`, discriminator.toString('hex'));
        
        let offset = 8;

        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for authority at offset ${offset}`);
          continue;
        }
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        if (offset + 32 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for scanner at offset ${offset}`);
          continue;
        }
        const scanner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for event_id at offset ${offset}`);
          continue;
        }
        const eventId = data.readBigUInt64LE(offset);
        offset += 8;

        if (offset + 4 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for name length at offset ${offset}`);
          continue;
        }
        const nameLength = data.readUInt32LE(offset);
        offset += 4;
        
        if (nameLength > 1000 || offset + nameLength > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} invalid name length ${nameLength} at offset ${offset}, data length ${dataLength}`);
          continue;
        }
        const name = data.slice(offset, offset + nameLength).toString("utf-8");
        offset += nameLength;

        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for start_ts at offset ${offset}`);
          continue;
        }
        const startTs = data.readBigInt64LE(offset);
        offset += 8;

        if (offset + 8 > dataLength) {
          console.warn(`Account ${account.pubkey.toString()} insufficient data for end_ts at offset ${offset}`);
          continue;
        }
        const endTs = data.readBigInt64LE(offset);
        offset += 8;

        let ticketsSold = 0;
        let ticketSupply = 100; // Default supply for old events
        let version = 0; // Default to version 0 for legacy events

        if (offset + 4 <= dataLength) {
          const rawTicketsSold = data.readUInt32LE(offset);
          if (rawTicketsSold < 1000000) {
            ticketsSold = rawTicketsSold;
          }
          offset += 4;
        } else {
          console.log(`Account ${account.pubkey.toString()} is an old event, using default tickets_sold=0`);
        }

        if (offset + 4 <= dataLength) {
          const rawTicketSupply = data.readUInt32LE(offset);
          if (rawTicketSupply > 0 && rawTicketSupply < 1000000) {
            ticketSupply = rawTicketSupply;
          }
          offset += 4;
        } else {
          console.log(`Account ${account.pubkey.toString()} is an old event, using default ticket_supply=100`);
        }

        // Try to read version (1 byte) - default to 0 for legacy events
        if (offset + 1 <= dataLength) {
          version = data.readUInt8(offset);
          offset += 1;
        } else {
          console.log(`Account ${account.pubkey.toString()} is a legacy event without version field`);
        }

        // Try to read cover_image_url (String with length prefix)
        let coverImageUrl = "";
        if (offset + 4 <= dataLength) {
          const urlLength = data.readUInt32LE(offset);
          offset += 4;
          if (urlLength > 0 && urlLength <= 200 && offset + urlLength <= dataLength) {
            coverImageUrl = data.slice(offset, offset + urlLength).toString("utf-8");
            offset += urlLength;
          }
        }

        if (offset + 1 <= dataLength) {
          version = data.readUInt8(offset);
          offset += 1;
        } else {
          console.log(`Account ${account.pubkey.toString()} is a legacy event without version field`);
        }

        let coverImageUrl = "";
        if (offset + 4 <= dataLength) {
          const urlLength = data.readUInt32LE(offset);
          offset += 4;
          if (urlLength > 0 && urlLength <= 200 && offset + urlLength <= dataLength) {
            coverImageUrl = data.slice(offset, offset + urlLength).toString("utf-8");
            offset += urlLength;
          }
        }

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

    const now = Math.floor(Date.now() / 1000);
    const activeEvents = events.filter(event => event.endTs > now);

    // Filter out events with no ticket supply (0 or invalid) and only show version 1 events
    const validEvents = activeEvents.filter(event =>
      event.ticketSupply > 0 && event.version === 1
    );

    // Sort by start time (most recent first)
    validEvents.sort((a, b) => b.startTs - a.startTs);
    // Deduplicate events based on name, organizer, and timing
    // Keep the most recent event if there are duplicates
    const uniqueEvents = new Map<string, EventData>();
    
    activeEvents.forEach(event => {
      const key = `${event.name}-${event.authority}`;
      const existing = uniqueEvents.get(key);
      
      if (!existing) {
        uniqueEvents.set(key, event);
      } else {
        // If we have a duplicate, keep the one with the most recent timestamp
        // This handles cases where the retry logic created multiple events
        if (event.startTs > existing.startTs) {
          console.log(`Removing duplicate event: ${event.name} (keeping newer version)`);
          uniqueEvents.set(key, event);
        } else {
          console.log(`Removing duplicate event: ${event.name} (keeping existing version)`);
        }
      }
    });

    // Convert back to array and sort by start time (most recent first)
    const deduplicatedEvents = Array.from(uniqueEvents.values());
    deduplicatedEvents.sort((a, b) => b.startTs - a.startTs);

    return validEvents;
    console.log(`Deduplicated ${activeEvents.length} events to ${deduplicatedEvents.length} unique events`);
    
    // Fetch real ticket counts for each event
    const eventsWithRealData = await Promise.all(
      deduplicatedEvents.map(async (event) => {
        try {
          const realTicketData = await fetchRealTicketData(connection, event.publicKey);
          return {
            ...event,
            ticketsSold: realTicketData.ticketsSold,
            // Keep the original ticketSupply from the event account, don't override it
            ticketSupply: event.ticketSupply
          };
        } catch (error) {
          console.error(`Error fetching real ticket data for event ${event.name}:`, error);
          return event; // Return original event data if real data fetch fails
        }
      })
    );
    
    return eventsWithRealData;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * Fetch real ticket data for an event by counting actual ticket accounts
 */
async function fetchRealTicketData(
  connection: Connection,
  eventPublicKey: string
): Promise<{ ticketsSold: number; ticketSupply: number }> {
  try {
    console.log(`🎫 Fetching real ticket data for event: ${eventPublicKey}`);
    
    // Fetch all ticket accounts for this event
    const ticketFilters = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
        },
      },
      {
        memcmp: {
          offset: 8, // After discriminator, event pubkey starts at offset 8
          bytes: eventPublicKey,
        },
      },
    ];

    const ticketAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: ticketFilters,
    });

    const ticketsSold = ticketAccounts.length;
    
    console.log(`🎫 Event ${eventPublicKey}: ${ticketsSold} tickets sold`);
    
    return {
      ticketsSold,
      ticketSupply: 100 // This will be overridden by the original event data
    };
  } catch (error) {
    console.error(`Error fetching real ticket data for event ${eventPublicKey}:`, error);
    return {
      ticketsSold: 0,
      ticketSupply: 100
    };
  }
}

/**
 * Get detailed ticket statistics for an event
 */
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
          bytes: eventPublicKey,
        },
      },
    ];

    const ticketAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: ticketFilters,
    });

    const ticketsSold = ticketAccounts.length;
    
    console.log(`Event ${eventPublicKey}: ${ticketsSold} tickets sold`);
    
    return {
      ticketsSold,
      ticketSupply: 100
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

        let ticketsSold = 0;
        let ticketSupply = 100; // Default supply for old events
        let version = 0; // Default to version 0 for legacy events

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

        // Try to read version (1 byte) - default to 0 for legacy events
        if (offset + 1 <= data.length) {
          version = data.readUInt8(offset);
          offset += 1;
        }

        // Try to read cover_image_url (String with length prefix)
        let coverImageUrl = "";
        if (offset + 4 <= data.length) {
          const urlLength = data.readUInt32LE(offset);
          offset += 4;
          if (urlLength > 0 && urlLength <= 200 && offset + urlLength <= data.length) {
            coverImageUrl = data.slice(offset, offset + urlLength).toString("utf-8");
            offset += urlLength;
          }
        }

        const bump = data.readUInt8(offset);

        return {
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
      } catch (err) {
        console.error(`Error fetching event ${eventKey}:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Update each event with real ticket data
    for (const eventData of results) {
      if (eventData) {
        try {
          const realTicketData = await fetchRealTicketData(connection, eventData.publicKey);
          const updatedEventData = {
            ...eventData,
            ticketsSold: realTicketData.ticketsSold,
            // Keep the original ticketSupply from the event account, don't override it
            ticketSupply: eventData.ticketSupply
          };
          eventsMap.set(eventData.publicKey, updatedEventData);
        } catch (error) {
          console.error(`Error fetching real ticket data for event ${eventData.publicKey}:`, error);
          eventsMap.set(eventData.publicKey, eventData); // Use original data if real data fetch fails
        }
      }
    }

    console.log(`Fetched ${eventsMap.size} events successfully`);
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
  if (!timestamp || timestamp < 0 || timestamp > 4102444800) {
    return "Invalid Date";
  }
  
  const date = new Date(timestamp * 1000);
  
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

  // Create provider
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  // Create program instance
  const program = new Program(idl as any, provider);

  console.log("Deleting event:", {
    eventId,
    eventPda: eventPublicKey.toString(),
  });

  try {
    // Call delete_event instruction
    const tx = await program.methods
      .deleteEvent(new BN(eventId))
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

  // Handle cover photo upload
  let coverImageUrl = "";
  if (params.coverPhoto) {
    console.log("Uploading cover photo:", params.coverPhoto.name, "Size:", params.coverPhoto.size);
    const { uploadEventImage } = await import("./imageService");
    coverImageUrl = await uploadEventImage(params.coverPhoto);
    console.log("Cover image URL:", coverImageUrl || "(placeholder)");
  }

  const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

  // Create provider
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
    const tx = await program.methods
      .deleteEvent(new BN(eventId))
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

  // Generate unique event ID from timestamp + random component to reduce collisions
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

  // Check if an event with the same name and organizer already exists
  try {
    const existingEvents = await fetchAllEvents(connection, wallet.publicKey);
    const duplicateEvent = existingEvents.find(event => 
      event.name === params.name && 
      event.authority === wallet.publicKey.toString()
    );
    
    if (duplicateEvent) {
      throw new Error(`An event with the name "${params.name}" already exists. Please choose a different name.`);
    }
  } catch (checkError) {
    console.log("Could not check for existing events, proceeding with creation");
  }

  try {
    const existingEvents = await fetchAllEvents(connection, wallet.publicKey);
    const duplicateEvent = existingEvents.find(event => 
      event.name === params.name && 
      event.authority === wallet.publicKey.toString()
    );
    
    if (duplicateEvent) {
      throw new Error(`An event with the name "${params.name}" already exists. Please choose a different name.`);
    }
  } catch (checkError) {
    console.log("Could not check for existing events, proceeding with creation");
  }

  try {
    const tx = await program.methods
      .createEvent(eventId, params.name, startTs, endTs, params.ticketSupply, coverImageUrl)
      .accounts({
        organizer: wallet.publicKey,
        eventAccount: eventPda,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Event created! Transaction:", tx);

    return tx;
  } catch (error: any) {
    if (error?.message?.includes("already in use") ||
        error?.message?.includes("already been processed")) {
      
      // First, check if the original event was actually created successfully
      try {
        const existingEvent = await connection.getAccountInfo(eventPda);
        if (existingEvent) {
          console.log("Event already exists, returning existing transaction");
          // The event was created successfully, just return a mock signature
          // since we can't get the original transaction signature
          return "existing-event-" + eventPda.toString();
        }
      } catch (checkError) {
        console.log("Could not check existing event, proceeding with retry");
      }

      // Only retry if the event doesn't actually exist
      console.log("Event account doesn't exist, retrying with new ID");
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
        .createEvent(retryEventId, params.name, startTs, endTs, params.ticketSupply, coverImageUrl)
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
