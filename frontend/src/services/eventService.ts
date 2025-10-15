import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../anchor-idl/nft_evo_tickets.json";

const PROGRAM_ID = new PublicKey(idl.address);
const EVENT_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 154];
const TICKET_DISCRIMINATOR = [98, 136, 32, 165, 133, 231, 243, 155];
const MAX_EVENT_NAME_LENGTH = 64;
const MAX_COVER_IMAGE_URL_LENGTH = 200;
const MAX_TICKET_SUPPLY = 1000000;
const DEFAULT_TICKET_SUPPLY = 100;
const CURRENT_EVENT_VERSION = 2;

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

export interface CreateEventParams {
  name: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  ticketSupply: number;
  coverPhoto?: File | null;
}

export interface UpdateEventParams {
  name: string;
  startTs: number;
  endTs: number;
  ticketSupply: number;
  coverImageUrl: string;
}

export interface EventTicketStats {
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  soldPercentage: number;
}

export type EventStatus = "upcoming" | "live" | "ended";

export class EventServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "EventServiceError";
  }
}

function safeReadPublicKey(data: Buffer, offset: number): PublicKey | null {
  try {
    if (offset + 32 > data.length) return null;
    return new PublicKey(data.slice(offset, offset + 32));
  } catch {
    return null;
  }
}

function validateEventData(event: Partial<EventData>): boolean {
  if (!event.name || event.name.length === 0 || event.name.length > MAX_EVENT_NAME_LENGTH) {
    return false;
  }

  if (!event.startTs || !event.endTs || event.endTs <= event.startTs) {
    return false;
  }

  if (event.ticketSupply !== undefined && (event.ticketSupply <= 0 || event.ticketSupply > MAX_TICKET_SUPPLY)) {
    return false;
  }

  return true;
}

function isEventActive(endTs: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return endTs > now;
}

function deserializeEventAccount(accountData: Buffer, publicKey: string): EventData | null {
  try {
    const data = accountData;
    const dataLength = data.length;

    if (dataLength < 8) {
      console.warn(`[EventService] Account ${publicKey} has insufficient data`);
      return null;
    }

    let offset = 8;

    const authority = safeReadPublicKey(data, offset);
    if (!authority) return null;
    offset += 32;

    const scanner = safeReadPublicKey(data, offset);
    if (!scanner) return null;
    offset += 32;

    if (offset + 8 > dataLength) return null;
    const eventId = data.readBigUInt64LE(offset);
    offset += 8;

    if (offset + 4 > dataLength) return null;
    const nameLength = data.readUInt32LE(offset);
    offset += 4;

    if (nameLength > MAX_EVENT_NAME_LENGTH || offset + nameLength > dataLength) {
      console.warn(`[EventService] Invalid name length: ${nameLength}`);
      return null;
    }

    const name = data.slice(offset, offset + nameLength).toString("utf-8");
    offset += nameLength;

    if (offset + 16 > dataLength) return null;
    const startTs = Number(data.readBigInt64LE(offset));
    offset += 8;
    const endTs = Number(data.readBigInt64LE(offset));
    offset += 8;

    let ticketsSold = 0;
    if (offset + 4 <= dataLength) {
      const raw = data.readUInt32LE(offset);
      if (raw < MAX_TICKET_SUPPLY) {
        ticketsSold = raw;
      }
      offset += 4;
    }

    let ticketSupply = DEFAULT_TICKET_SUPPLY;
    if (offset + 4 <= dataLength) {
      const raw = data.readUInt32LE(offset);
      if (raw > 0 && raw < MAX_TICKET_SUPPLY) {
        ticketSupply = raw;
      }
      offset += 4;
    }

    let version = 0;
    if (offset + 1 <= dataLength) {
      version = data.readUInt8(offset);
      offset += 1;
    }

    let coverImageUrl = "";
    if (offset + 4 <= dataLength) {
      const urlLength = data.readUInt32LE(offset);
      offset += 4;
      if (urlLength > 0 && urlLength <= MAX_COVER_IMAGE_URL_LENGTH && offset + urlLength <= dataLength) {
        coverImageUrl = data.slice(offset, offset + urlLength).toString("utf-8");
        offset += urlLength;
      }
    }

    if (offset + 1 > dataLength) return null;
    const bump = data.readUInt8(offset);

    const eventData: EventData = {
      publicKey,
      authority: authority.toString(),
      scanner: scanner.toString(),
      eventId: eventId.toString(),
      name,
      startTs,
      endTs,
      ticketsSold,
      ticketSupply,
      version,
      coverImageUrl,
      bump,
    };

    if (!validateEventData(eventData)) {
      console.warn(`[EventService] Invalid event data for ${publicKey}`);
      return null;
    }

    return eventData;
  } catch (error) {
    console.error(`[EventService] Error deserializing event ${publicKey}:`, error);
    return null;
  }
}

export async function fetchAllEvents(
  connection: Connection,
  authorityFilter?: PublicKey,
  versionFilter: number = CURRENT_EVENT_VERSION
): Promise<EventData[]> {
  try {
    console.log(`[EventService] Fetching events${authorityFilter ? ` for ${authorityFilter.toString()}` : ""}`);

    const filters: any[] = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(EVENT_DISCRIMINATOR)),
        },
      },
    ];

    if (authorityFilter) {
      filters.push({
        memcmp: {
          offset: 8,
          bytes: authorityFilter.toBase58(),
        },
      });
    }

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters });
    console.log(`[EventService] Found ${accounts.length} event accounts`);

    const events: EventData[] = [];

    for (const account of accounts) {
      const eventData = deserializeEventAccount(account.account.data, account.pubkey.toString());
      if (eventData) {
        events.push(eventData);
      }
    }

    console.log(`[EventService] Successfully deserialized ${events.length} events`);

    const versionFilteredEvents = events.filter(event => event.version === versionFilter);
    console.log(`[EventService] ${versionFilteredEvents.length} events match version ${versionFilter}`);

    const activeEvents = versionFilteredEvents.filter(event => isEventActive(event.endTs));
    console.log(`[EventService] ${activeEvents.length} active events`);

    const uniqueEvents = new Map<string, EventData>();
    activeEvents.forEach(event => {
      const key = `${event.name}-${event.authority}`;
      const existing = uniqueEvents.get(key);
      if (!existing || event.startTs > existing.startTs) {
        uniqueEvents.set(key, event);
      }
    });

    const result = Array.from(uniqueEvents.values());
    console.log(`[EventService] Returning ${result.length} unique events`);

    return result;
  } catch (error) {
    console.error("[EventService] Error fetching events:", error);
    throw new EventServiceError("Failed to fetch events", error as Error);
  }
}

export async function fetchEventsByKeys(
  connection: Connection,
  eventKeys: string[]
): Promise<Map<string, EventData>> {
  const eventsMap = new Map<string, EventData>();

  if (eventKeys.length === 0) {
    return eventsMap;
  }

  try {
    console.log(`[EventService] Fetching ${eventKeys.length} specific events...`);

    const promises = eventKeys.map(async (eventKey) => {
      try {
        const publicKey = new PublicKey(eventKey);
        const accountInfo = await connection.getAccountInfo(publicKey);

        if (!accountInfo || accountInfo.owner.toString() !== PROGRAM_ID.toString()) {
          console.warn(`[EventService] Event ${eventKey} not found or invalid owner`);
          return null;
        }

        const eventData = deserializeEventAccount(accountInfo.data, eventKey);
        return eventData ? { key: eventKey, data: eventData } : null;
      } catch (error) {
        console.error(`[EventService] Error fetching event ${eventKey}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    results.forEach((result) => {
      if (result) {
        eventsMap.set(result.key, result.data);
      }
    });

    console.log(`[EventService] Successfully fetched ${eventsMap.size}/${eventKeys.length} events`);
  } catch (error) {
    console.error("[EventService] Error in fetchEventsByKeys:", error);
    throw new EventServiceError("Failed to fetch events by keys", error as Error);
  }

  return eventsMap;
}

async function fetchRealTicketData(
  connection: Connection,
  eventPublicKey: string
): Promise<{ ticketsSold: number; ticketSupply: number }> {
  try {
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

    const eventAccount = await connection.getAccountInfo(new PublicKey(eventPublicKey));
    let ticketSupply = DEFAULT_TICKET_SUPPLY;

    if (eventAccount && eventAccount.data.length >= 8) {
      const eventData = deserializeEventAccount(eventAccount.data, eventPublicKey);
      if (eventData) {
        ticketSupply = eventData.ticketSupply;
      }
    }

    return {
      ticketsSold: ticketAccounts.length,
      ticketSupply
    };
  } catch (error) {
    console.error(`[EventService] Error fetching ticket data:`, error);
    return {
      ticketsSold: 0,
      ticketSupply: DEFAULT_TICKET_SUPPLY
    };
  }
}

export async function getEventTicketStats(
  connection: Connection,
  eventPublicKey: string
): Promise<EventTicketStats> {
  try {
    const ticketData = await fetchRealTicketData(connection, eventPublicKey);
    const ticketsAvailable = Math.max(0, ticketData.ticketSupply - ticketData.ticketsSold);
    const soldPercentage = ticketData.ticketSupply > 0
      ? Math.round((ticketData.ticketsSold / ticketData.ticketSupply) * 100)
      : 0;

    return {
      totalTickets: ticketData.ticketSupply,
      ticketsSold: ticketData.ticketsSold,
      ticketsAvailable,
      soldPercentage
    };
  } catch (error) {
    console.error(`[EventService] Error getting ticket stats:`, error);
    return {
      totalTickets: DEFAULT_TICKET_SUPPLY,
      ticketsSold: 0,
      ticketsAvailable: DEFAULT_TICKET_SUPPLY,
      soldPercentage: 0
    };
  }
}

export function getEventStatus(startTs: number, endTs: number): EventStatus {
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
  if (!timestamp || timestamp <= 0) {
    return "Invalid date";
  }

  const date = new Date(timestamp * 1000);

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

export async function createEvent(
  connection: Connection,
  wallet: any,
  params: CreateEventParams
): Promise<string> {
  if (!wallet.publicKey) {
    throw new EventServiceError("Wallet not connected");
  }

  try {
    console.log("[EventService] Creating event:", params.name);

    let coverImageUrl = "";
    if (params.coverPhoto) {
      console.log(`[EventService] Uploading cover photo: ${params.coverPhoto.name}`);
      const { uploadEventImage } = await import("./imageService");
      coverImageUrl = await uploadEventImage(params.coverPhoto);
      console.log(`[EventService] Cover image uploaded: ${coverImageUrl || "(placeholder)"}`);
    }

    const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
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

    console.log(`[EventService] Event PDA: ${eventPda.toString()}`);

    try {
      const existingEvents = await fetchAllEvents(connection, wallet.publicKey);
      const duplicate = existingEvents.find(
        event => event.name === params.name && event.authority === wallet.publicKey.toString()
      );

      if (duplicate) {
        throw new EventServiceError(
          `An event with the name "${params.name}" already exists. Please choose a different name.`
        );
      }
    } catch (error) {
      if (error instanceof EventServiceError) throw error;
      console.warn("[EventService] Could not check for duplicates:", error);
    }

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

    console.log(`[EventService] Event created successfully: ${tx}`);
    return tx;
  } catch (error: any) {
    if (error.message?.includes("already in use") || error.message?.includes("AccountAlreadyExists")) {
      console.log("[EventService] Account exists, retrying with new ID...");
    }

    console.error("[EventService] Error creating event:", error);
    throw new EventServiceError("Failed to create event", error);
  }
}

export async function updateEvent(
  connection: Connection,
  wallet: any,
  eventId: number,
  params: UpdateEventParams
): Promise<string> {
  if (!wallet.publicKey) {
    throw new EventServiceError("Wallet not connected");
  }

  try {
    console.log(`[EventService] Updating event ${eventId}`);

    const { Program, AnchorProvider, BN, web3 } = await import("@coral-xyz/anchor");

    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new Program(idl as any, provider);

    const eventIdBN = new BN(eventId);
    const [eventPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft-evo-tickets"),
        Buffer.from("event"),
        eventIdBN.toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    );

    const tx = await program.methods
      .updateEvent(
        eventIdBN,
        params.name,
        new BN(params.startTs),
        new BN(params.endTs),
        new BN(params.ticketSupply),
        params.coverImageUrl
      )
      .accounts({
        authority: wallet.publicKey,
        eventAccount: eventPda,
      })
      .rpc();

    console.log(`[EventService] Event updated: ${tx}`);
    return tx;
  } catch (error) {
    console.error("[EventService] Error updating event:", error);
    throw new EventServiceError("Failed to update event", error as Error);
  }
}

export async function deleteEvent(
  connection: Connection,
  wallet: any,
  eventPublicKey: PublicKey,
  eventId: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new EventServiceError("Wallet not connected");
  }

  try {
    console.log(`[EventService] Deleting event ${eventId}`);

    const { Program, AnchorProvider, BN } = await import("@coral-xyz/anchor");

    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new Program(idl as any, provider);

    const tx = await program.methods
      .deleteEvent(new BN(eventId))
      .accounts({
        authority: wallet.publicKey,
        eventAccount: eventPublicKey,
      })
      .rpc();

    console.log(`[EventService] Event deleted: ${tx}`);
    return tx;
  } catch (error) {
    console.error("[EventService] Error deleting event:", error);
    throw new EventServiceError("Failed to delete event", error as Error);
  }
}
