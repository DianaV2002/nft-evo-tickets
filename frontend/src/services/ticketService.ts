import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "../anchor-idl/nft_evo_tickets.json";

const PROGRAM_ID = new PublicKey(idl.address);
const PROGRAM_SEED = "nft-evo-tickets";
const LISTING_SEED = "listing";
const TICKET_SEED = "ticket";
const TICKET_DISCRIMINATOR = [231, 93, 13, 18, 239, 66, 21, 45]; // TicketAccount discriminator from IDL
const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface TicketData {
  publicKey: string;
  event: string;
  owner: string;
  nftMint: string;
  seat: string | null;
  stage: TicketStage;
  isListed: boolean;
  wasScanned: boolean;
  listingPrice: number | null;
  listingExpiresAt: number | null;
  bump: number;
}

export enum TicketStage {
  Prestige = 0,
  Qr = 1,
  Scanned = 2,
  Collectible = 3,
}

export interface ListingData {
  publicKey: string;
  ticket: string;
  seller: string;
  priceLamports: number;
  createdAt: number;
  expiresAt: number | null;
  bump: number;
}

/**
 * Fetch all tickets owned by a specific user (including all versions)
 */
export async function fetchUserTickets(
  connection: Connection,
  ownerPublicKey: PublicKey
): Promise<TicketData[]> {
  try {
    console.log("🎫 Fetching tickets for owner:", ownerPublicKey.toBase58());
    console.log("📦 Program ID:", PROGRAM_ID.toBase58());

    const filters: any[] = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(TICKET_DISCRIMINATOR)),
        },
      },
      {
        memcmp: {
          offset: 8 + 32, // After discriminator (8) and event pubkey (32), owner starts
          bytes: ownerPublicKey.toBase58(),
        },
      },
    ];

    console.log(" Fetching program accounts with filters...");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });

    console.log(` Found ${accounts.length} ticket account(s)`);
    const tickets: TicketData[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;
        let offset = 8; // Skip discriminator

        // Event (32 bytes)
        const event = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Owner (32 bytes)
        const owner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // NFT Mint (32 bytes)
        const nftMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Seat (Option<String>)
        const hasSeat = data.readUInt8(offset);
        offset += 1;
        let seat: string | null = null;
        if (hasSeat === 1) {
          const seatLength = data.readUInt32LE(offset);
          offset += 4;
          seat = data.slice(offset, offset + seatLength).toString("utf-8");
          offset += seatLength;
        }

        // Stage (1 byte enum)
        const stage = data.readUInt8(offset) as TicketStage;
        offset += 1;

        // is_listed (bool, 1 byte)
        const isListed = data.readUInt8(offset) === 1;
        offset += 1;

        // was_scanned (bool, 1 byte)
        const wasScanned = data.readUInt8(offset) === 1;
        offset += 1;

        // listing_price (Option<u64>)
        const hasListingPrice = data.readUInt8(offset);
        offset += 1;
        let listingPrice: number | null = null;
        if (hasListingPrice === 1) {
          listingPrice = Number(data.readBigUInt64LE(offset));
          offset += 8;
        }

        // listing_expires_at (Option<i64>)
        const hasListingExpiresAt = data.readUInt8(offset);
        offset += 1;
        let listingExpiresAt: number | null = null;
        if (hasListingExpiresAt === 1) {
          listingExpiresAt = Number(data.readBigInt64LE(offset));
          offset += 8;
        }

        // bump (1 byte)
        const bump = data.readUInt8(offset);

        tickets.push({
          publicKey: account.pubkey.toString(),
          event: event.toString(),
          owner: owner.toString(),
          nftMint: nftMint.toString(),
          seat,
          stage,
          isListed,
          wasScanned,
          listingPrice,
          listingExpiresAt,
          bump,
        });
      } catch (err) {
        console.error(`Error decoding ticket account ${account.pubkey.toString()}:`, err);
      }
    }

    console.log("✅ Successfully parsed tickets:", tickets);
    return tickets;
  } catch (error) {
    console.error("❌ Error fetching user tickets:", error);
    return [];
  }
}

/**
 * Fetch only tickets for version 2 events (filtered by event version)
 */
export async function fetchUserTicketsV2Only(
  connection: Connection,
  ownerPublicKey: PublicKey
): Promise<TicketData[]> {
  try {
    console.log("🎫 Fetching version 2 tickets for owner:", ownerPublicKey.toBase58());

    // First, fetch all user tickets
    const allTickets = await fetchUserTickets(connection, ownerPublicKey);

    if (allTickets.length === 0) {
      console.log("✅ No tickets found");
      return [];
    }

    console.log(`📋 Found ${allTickets.length} total tickets, filtering by event version...`);

    // Import fetchEventsByKeys to get event data
    const { fetchEventsByKeys } = await import("./eventService");

    // Get unique event public keys from tickets
    const eventKeys = [...new Set(allTickets.map(ticket => ticket.event))];

    // Fetch all event data
    const eventsMap = await fetchEventsByKeys(connection, eventKeys);

    // Filter tickets where the associated event has version === 2
    const v2Tickets = allTickets.filter(ticket => {
      const event = eventsMap.get(ticket.event);
      return event && event.version === 2;
    });

    console.log(`✅ Filtered to ${v2Tickets.length} version 2 tickets`);
    return v2Tickets;
  } catch (error) {
    console.error("❌ Error fetching version 2 tickets:", error);
    return [];
  }
}

/**
 * Fetch all active listings (tickets listed for sale)
 */
export async function fetchActiveListings(
  connection: Connection
): Promise<Array<ListingData & { ticketData?: TicketData }>> {
  try {
    console.log("🔍 Fetching active listings from program:", PROGRAM_ID.toBase58());
    // ListingAccount discriminator from IDL
    const LISTING_DISCRIMINATOR = [59, 89, 136, 25, 21, 196, 183, 13];

    const filters: any[] = [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(Buffer.from(LISTING_DISCRIMINATOR)),
        },
      },
    ];

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });

    console.log(`📋 Found ${accounts.length} listing account(s)`);

    const listings: Array<ListingData & { ticketData?: TicketData }> = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;
        let offset = 8; // Skip discriminator

        // Ticket (32 bytes)
        const ticket = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Seller (32 bytes)
        const seller = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // price_lamports (u64)
        const priceLamports = Number(data.readBigUInt64LE(offset));
        offset += 8;

        // created_at (i64)
        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;

        // expires_at (Option<i64>)
        const hasExpiresAt = data.readUInt8(offset);
        offset += 1;
        let expiresAt: number | null = null;
        if (hasExpiresAt === 1) {
          expiresAt = Number(data.readBigInt64LE(offset));
          offset += 8;
        }

        // bump (1 byte)
        const bump = data.readUInt8(offset);

        // Check if listing is expired
        if (expiresAt !== null) {
          const now = Math.floor(Date.now() / 1000);
          if (now > expiresAt) {
            console.log(`⏰ Skipping expired listing: ${account.pubkey.toString()}`);
            continue; // Skip expired listings
          }
        }

        console.log(`✅ Decoded listing:`, {
          publicKey: account.pubkey.toString(),
          ticket: ticket.toString(),
          seller: seller.toString(),
          priceLamports,
        });

        // Fetch the ticket data for this listing
        let ticketData: TicketData | undefined;
        try {
          const ticketAccount = await connection.getAccountInfo(ticket);
          if (ticketAccount) {
            const ticketDataBuffer = ticketAccount.data;
            let ticketOffset = 8; // Skip discriminator

            // Event (32 bytes)
            const event = new PublicKey(ticketDataBuffer.slice(ticketOffset, ticketOffset + 32));
            ticketOffset += 32;

            // Owner (32 bytes)
            const owner = new PublicKey(ticketDataBuffer.slice(ticketOffset, ticketOffset + 32));
            ticketOffset += 32;

            // NFT Mint (32 bytes)
            const nftMint = new PublicKey(ticketDataBuffer.slice(ticketOffset, ticketOffset + 32));
            ticketOffset += 32;

            // Seat (Option<String>)
            const hasSeat = ticketDataBuffer.readUInt8(ticketOffset);
            ticketOffset += 1;
            let seat: string | null = null;
            if (hasSeat === 1) {
              const seatLength = ticketDataBuffer.readUInt32LE(ticketOffset);
              ticketOffset += 4;
              seat = ticketDataBuffer.slice(ticketOffset, ticketOffset + seatLength).toString("utf-8");
              ticketOffset += seatLength;
            }

            // Stage (1 byte enum)
            const stage = ticketDataBuffer.readUInt8(ticketOffset) as TicketStage;
            ticketOffset += 1;

            // is_listed (bool, 1 byte)
            const isListed = ticketDataBuffer.readUInt8(ticketOffset) === 1;
            ticketOffset += 1;

            // was_scanned (bool, 1 byte)
            const wasScanned = ticketDataBuffer.readUInt8(ticketOffset) === 1;
            ticketOffset += 1;

            // listing_price (Option<u64>)
            const hasListingPrice = ticketDataBuffer.readUInt8(ticketOffset);
            ticketOffset += 1;
            let listingPrice: number | null = null;
            if (hasListingPrice === 1) {
              listingPrice = Number(ticketDataBuffer.readBigUInt64LE(ticketOffset));
              ticketOffset += 8;
            }

            // listing_expires_at (Option<i64>)
            const hasListingExpiresAt = ticketDataBuffer.readUInt8(ticketOffset);
            ticketOffset += 1;
            let listingExpiresAt: number | null = null;
            if (hasListingExpiresAt === 1) {
              listingExpiresAt = Number(ticketDataBuffer.readBigInt64LE(ticketOffset));
              ticketOffset += 8;
            }

            // bump (1 byte)
            const ticketBump = ticketDataBuffer.readUInt8(ticketOffset);

            ticketData = {
              publicKey: ticket.toString(),
              event: event.toString(),
              owner: owner.toString(),
              nftMint: nftMint.toString(),
              seat,
              stage,
              isListed,
              wasScanned,
              listingPrice,
              listingExpiresAt,
              bump: ticketBump,
            };

            console.log(`🎫 Fetched ticket data for listing:`, ticketData);
          }
        } catch (ticketErr) {
          console.error(`Error fetching ticket data for ${ticket.toString()}:`, ticketErr);
        }

        listings.push({
          publicKey: account.pubkey.toString(),
          ticket: ticket.toString(),
          seller: seller.toString(),
          priceLamports,
          createdAt,
          expiresAt,
          bump,
          ticketData,
        });
      } catch (err) {
        console.error(`Error decoding listing account ${account.pubkey.toString()}:`, err);
      }
    }

    console.log(`✅ Returning ${listings.length} active listings with ticket data`);
    return listings;
  } catch (error) {
    console.error("Error fetching active listings:", error);
    return [];
  }
}

/**
 * Buy a ticket directly from an event (primary market)
 * This mints a new ticket and transfers payment to the organizer
 */
export async function buyEventTicket(
  connection: Connection,
  wallet: any,
  eventPublicKey: PublicKey,
  ticketPriceLamports: number,
  seat?: string
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3, BN } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    {
      commitment: "confirmed",
      skipPreflight: false,
      preflightCommitment: "confirmed"
    }
  );

  const program = new Program(idl as any, provider);

  try {
    const buyer = wallet.publicKey;

    const eventAccount = await program.account.eventAccount.fetch(eventPublicKey);
    const organizer = eventAccount.authority as PublicKey;

    const ticketId = Date.now() + Math.floor(Math.random() * 1000000);
    const ticketIdBuffer = Buffer.alloc(8);
    ticketIdBuffer.writeBigUInt64LE(BigInt(ticketId));

    // Derive ticket PDA (now includes ticket_id)
    const [ticketPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(TICKET_SEED),
        eventPublicKey.toBuffer(),
        buyer.toBuffer(),
        ticketIdBuffer,
      ],
      PROGRAM_ID
    );

    // Derive NFT mint PDA (now includes ticket_id)
    const [nftMintPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from("nft-mint"),
        eventPublicKey.toBuffer(),
        buyer.toBuffer(),
        ticketIdBuffer,
      ],
      PROGRAM_ID
    );

    // Derive metadata PDA
    const [metadataPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive master edition PDA
    const [masterEditionPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive buyer's token account
    const buyerTokenAccount = await getAssociatedTokenAddress(
      nftMintPda,
      buyer
    );

    console.log("[TicketService] Purchasing ticket:", {
      buyer: buyer.toString(),
      organizer: organizer.toString(),
      eventAccount: eventPublicKey.toString(),
      ticketAccount: ticketPda.toString(),
      nftMint: nftMintPda.toString(),
      ticketId: ticketId,
      price: `${ticketPriceLamports / 1e9} SOL`,
    });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");

    const tx = await program.methods
      .buyEventTicket(new BN(ticketPriceLamports), seat || null, new BN(ticketId))
      .accounts({
        buyer: buyer,
        eventAccount: eventPublicKey,
        organizer: organizer,
        ticketAccount: ticketPda,
        nftMint: nftMintPda,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        skipPreflight: false,
        maxRetries: 3,
      });

    await connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, "confirmed");

    console.log("[TicketService] Ticket purchased successfully:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error purchasing ticket:", error);
    throw error;
  }
}

/**
 * Mint a new ticket for an event (for event organizers only)
 */
export async function mintTicket(
  connection: Connection,
  wallet: any,
  eventPublicKey: PublicKey,
  seat?: string
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  try {
    // The buyer/wallet is the owner of the new ticket
    const owner = wallet.publicKey;

    // Get event data to find the authority
    const eventAccount = await program.account.eventAccount.fetch(eventPublicKey);
    const eventAuthority = eventAccount.authority as PublicKey;

    // Derive ticket PDA
    const [ticketPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(TICKET_SEED),
        eventPublicKey.toBuffer(),
        owner.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive NFT mint PDA
    const [nftMintPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from("nft-mint"),
        eventPublicKey.toBuffer(),
        owner.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive metadata PDA (Metaplex standard)
    const [metadataPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive master edition PDA
    const [masterEditionPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive associated token account for owner
    const ownerTokenAccount = await getAssociatedTokenAddress(
      nftMintPda,
      owner
    );

    console.log("Minting ticket:", {
      authority: eventAuthority.toString(),
      eventAccount: eventPublicKey.toString(),
      ticketAccount: ticketPda.toString(),
      owner: owner.toString(),
      nftMint: nftMintPda.toString(),
      metadata: metadataPda.toString(),
      masterEdition: masterEditionPda.toString(),
      tokenAccount: ownerTokenAccount.toString(),
      seat: seat || null,
    });

    // Note: The authority must sign this transaction
    // This means either:
    // 1. The wallet IS the event authority (event organizer buying for someone)
    // 2. We need a different instruction that doesn't require authority signature

    // For now, let's assume the user IS the authority or we show an error
    if (eventAuthority.toString() !== owner.toString()) {
      throw new Error("Only the event organizer can mint tickets. This feature is for organizers to distribute tickets.");
    }

    // Call mint_ticket instruction
    const tx = await program.methods
      .mintTicket(seat || null, null) // seat, metadata_uri_override
      .accounts({
        authority: owner, // The wallet must be the event authority
        eventAccount: eventPublicKey,
        ticketAccount: ticketPda,
        owner: owner,
        nftMint: nftMintPda,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenAccount: ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Ticket minted! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error minting ticket:", error);
    throw error;
  }
}

/**
 * Buy a ticket from the marketplace (secondary market)
 */
export async function buyTicket(
  connection: Connection,
  wallet: any,
  ticketPublicKey: PublicKey,
  listingPublicKey: PublicKey,
  eventPublicKey: PublicKey,
  sellerPublicKey: PublicKey,
  nftMintPublicKey: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  try {
    console.log("Buying ticket:", {
      buyer: wallet.publicKey.toString(),
      ticketAccount: ticketPublicKey.toString(),
      eventAccount: eventPublicKey.toString(),
      seller: sellerPublicKey.toString(),
      nftMint: nftMintPublicKey.toString(),
    });

    const tx = await program.methods
      .buyEventTicket()
      .accounts({
        buyer: wallet.publicKey,
        ticketAccount: ticketPublicKey,
        eventAccount: eventPublicKey,
        seller: sellerPublicKey,
        nftMint: nftMintPublicKey,
      })
      .rpc();

    console.log("Ticket purchased! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error buying ticket:", error);
    throw error;
  }
}

/**
 * Get ticket stage name
 */
export function getTicketStageName(stage: TicketStage): string {
  switch (stage) {
    case TicketStage.Prestige:
      return "Prestige";
    case TicketStage.Qr:
      return "QR Code";
    case TicketStage.Scanned:
      return "Scanned";
    case TicketStage.Collectible:
      return "Collectible";
    default:
      return "Unknown";
  }
}

/**
 * Get ticket rarity based on stage
 */
export function getTicketRarity(stage: TicketStage): string {
  switch (stage) {
    case TicketStage.Prestige:
      return "Common";
    case TicketStage.Qr:
      return "Common";
    case TicketStage.Scanned:
      return "Rare";
    case TicketStage.Collectible:
      return "Legendary";
    default:
      return "Common";
  }
}

/**
 * Evolve ticket to QR stage (Prestige -> QR)
 * Only the event authority can call this
 */
export async function evolveTicketToQR(
  connection: Connection,
  wallet: any,
  ticketPublicKey: PublicKey,
  eventPublicKey: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  try {
    // Get event data
    const eventAccount = await program.account.eventAccount.fetch(eventPublicKey);
    const authority = eventAccount.authority as PublicKey;
    const scanner = eventAccount.scanner as PublicKey;

    console.log("Evolving ticket to QR stage:", {
      signer: wallet.publicKey.toString(),
      eventAccount: eventPublicKey.toString(),
      ticketAccount: ticketPublicKey.toString(),
      authority: authority.toString(),
      scanner: scanner.toString(),
    });

    // Call update_ticket with QR stage
    const tx = await program.methods
      .updateTicket({ qr: {} })
      .accounts({
        signer: wallet.publicKey,
        eventAccount: eventPublicKey,
        ticketAccount: ticketPublicKey,
        authority: authority,
        scanner: scanner,
      })
      .rpc();

    console.log("Ticket evolved to QR stage! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error evolving ticket:", error);
    throw error;
  }
}

/**
 * List a ticket on the marketplace
 * Tickets can only be listed in QR or Collectible stage
 */
export async function listTicketOnMarketplace(
  connection: Connection,
  wallet: any,
  ticketPublicKey: PublicKey,
  eventPublicKey: PublicKey,
  nftMintPublicKey: PublicKey,
  priceLamports: number,
  expiresAt?: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3, BN } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    {
      commitment: "confirmed",
      skipPreflight: false,
      preflightCommitment: "confirmed"
    }
  );

  const program = new Program(idl as any, provider);

  try {
    const seller = wallet.publicKey;

    // Derive listing PDA
    const [listingPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(LISTING_SEED),
        ticketPublicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive seller's NFT token account
    const sellerNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      seller
    );

    // Derive escrow NFT token account (owned by listing PDA)
    const escrowNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      listingPda,
      true // allowOwnerOffCurve
    );

    console.log("[TicketService] Listing ticket on marketplace:", {
      seller: seller.toString(),
      ticketAccount: ticketPublicKey.toString(),
      eventAccount: eventPublicKey.toString(),
      listingAccount: listingPda.toString(),
      nftMint: nftMintPublicKey.toString(),
      price: `${priceLamports / 1e9} SOL`,
      expiresAt: expiresAt || null,
    });

    const latestBlockhash = await connection.getLatestBlockhash("finalized");

    const tx = await program.methods
      .listTicket(new BN(priceLamports), expiresAt ? new BN(expiresAt) : null)
      .accounts({
        seller: seller,
        ticketAccount: ticketPublicKey,
        eventAccount: eventPublicKey,
        listingAccount: listingPda,
        nftMint: nftMintPublicKey,
        sellerNftAccount: sellerNftAccount,
        escrowNftAccount: escrowNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        skipPreflight: false,
        maxRetries: 3,
      });

    console.log("[TicketService] Transaction sent:", tx);

    // Wait for confirmation with extended timeout
    try {
      await connection.confirmTransaction({
        signature: tx,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, "confirmed");
    } catch (confirmError: any) {
      // If confirmation times out, check if transaction actually succeeded
      console.warn("[TicketService] Confirmation timeout, checking transaction status...");

      const status = await connection.getSignatureStatus(tx);
      if (status?.value?.confirmationStatus === "confirmed" || status?.value?.confirmationStatus === "finalized") {
        console.log("[TicketService] Transaction was actually confirmed!");
      } else {
        throw new Error(`Transaction confirmation timeout. Check status on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      }
    }

    console.log("[TicketService] Ticket listed successfully:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error listing ticket:", error);
    throw error;
  }
}

/**
 * Cancel a ticket listing on the marketplace
 */
export async function cancelTicketListing(
  connection: Connection,
  wallet: any,
  ticketPublicKey: PublicKey,
  nftMintPublicKey: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    {
      commitment: "confirmed",
      skipPreflight: false,
      preflightCommitment: "confirmed"
    }
  );

  const program = new Program(idl as any, provider);

  try {
    const seller = wallet.publicKey;

    // Derive listing PDA
    const [listingPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(LISTING_SEED),
        ticketPublicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive seller's NFT token account
    const sellerNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      seller
    );

    // Derive escrow NFT token account
    const escrowNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      listingPda,
      true
    );

    console.log("[TicketService] Canceling listing:", {
      seller: seller.toString(),
      ticketAccount: ticketPublicKey.toString(),
      listingAccount: listingPda.toString(),
    });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");

    const tx = await program.methods
      .cancelListing()
      .accounts({
        seller: seller,
        ticketAccount: ticketPublicKey,
        listingAccount: listingPda,
        nftMint: nftMintPublicKey,
        escrowNftAccount: escrowNftAccount,
        sellerNftAccount: sellerNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc({
        skipPreflight: false,
        maxRetries: 3,
      });

    await connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, "confirmed");

    console.log("[TicketService] Listing canceled successfully:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error canceling listing:", error);
    throw error;
  }
}

/**
 * Buy a ticket from the marketplace (secondary market)
 */
export async function buyMarketplaceTicket(
  connection: Connection,
  wallet: any,
  ticketPublicKey: PublicKey,
  eventPublicKey: PublicKey,
  sellerPublicKey: PublicKey,
  nftMintPublicKey: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    {
      commitment: "confirmed",
      skipPreflight: false,
      preflightCommitment: "confirmed"
    }
  );

  const program = new Program(idl as any, provider);

  try {
    const buyer = wallet.publicKey;

    // Derive listing PDA
    const [listingPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(LISTING_SEED),
        ticketPublicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive escrow NFT token account
    const escrowNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      listingPda,
      true
    );

    // Derive buyer's NFT token account
    const buyerNftAccount = await getAssociatedTokenAddress(
      nftMintPublicKey,
      buyer
    );

    console.log("[TicketService] Buying marketplace ticket:", {
      buyer: buyer.toString(),
      seller: sellerPublicKey.toString(),
      ticketAccount: ticketPublicKey.toString(),
      eventAccount: eventPublicKey.toString(),
      listingAccount: listingPda.toString(),
      nftMint: nftMintPublicKey.toString(),
    });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");

    const tx = await program.methods
      .buyMarketplaceTicket()
      .accounts({
        buyer: buyer,
        ticketAccount: ticketPublicKey,
        listingAccount: listingPda,
        eventAccount: eventPublicKey,
        seller: sellerPublicKey,
        nftMint: nftMintPublicKey,
        escrowNftAccount: escrowNftAccount,
        buyerNftAccount: buyerNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        skipPreflight: false,
        maxRetries: 3,
      });

    await connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, "confirmed");

    console.log("[TicketService] Marketplace ticket purchased successfully:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error buying marketplace ticket:", error);
    throw error;
  }
}
