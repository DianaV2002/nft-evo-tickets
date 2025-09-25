import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import dotenv from "dotenv";

dotenv.config();

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { getBundlr, uploadJsonToArweave, uploadPngToArweave, ensureBundlrFunds } from "./helpers/arweave";

async function ensureBalance(conn: Connection, pubkey: PublicKey, wantLamports: number) {
  const bal = await conn.getBalance(pubkey);
  if (bal >= wantLamports) return;

  console.log(`Balance for ${pubkey.toBase58()} is ${bal / LAMPORTS_PER_SOL} SOL. Requesting airdrop...`);
  try {
    const signature = await conn.requestAirdrop(pubkey, wantLamports - bal);
    await conn.confirmTransaction(signature);
    console.log("Airdrop successful.");
  } catch (error) {
    console.error(`Airdrop failed for ${pubkey.toBase58()}:`, error);
    throw new Error("Airdrop failed. Please fund your wallet manually or try again later if on a rate-limited network.");
  }
}

describe("nft-evo-tickets", function() {
  // Configure the client to use the local cluster.
  this.timeout(120_000);   // 2 minutes
  anchor.setProvider(anchor.AnchorProvider.env());

  before(async function() {
    await ensureBalance(provider.connection, provider.wallet!.publicKey, 1 * LAMPORTS_PER_SOL);
  });

  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;
  const provider = anchor.getProvider();

  it("Initialize program", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Program initialized:", tx);
  });

  it("Create event", async () => {
    const eventId = new anchor.BN(Date.now() + Math.random() * 1000);
    const eventName = "Test Concert 2024";
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const endTs = new anchor.BN(Math.floor(Date.now() / 1000) + 7200);

    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({
        organizer: provider.wallet!.publicKey,
        eventAccount: eventPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Event created:", tx);
    console.log("Event Account:", eventPda.toString());

    // Verify the event was created
    const eventAccount = await program.account.eventAccount.fetch(eventPda);
    console.log("Event Details:");
    console.log("  - Event ID:", eventAccount.eventId.toString());
    console.log("  - Name:", eventAccount.name);
    console.log("  - Authority:", eventAccount.authority.toString());
  });

  it("Mint ticket", async () => {
    // First create an event
    const eventId = new anchor.BN(Date.now() + Math.random() * 1000 + 1000);
    const eventName = "Concert for NFT Minting";
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const endTs = new anchor.BN(Math.floor(Date.now() / 1000) + 7200);

    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create event
    await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({
        organizer: provider.wallet!.publicKey,
        eventAccount: eventPda!,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Event created for minting test");

    // Now mint a ticket
    const ticketOwner = provider.wallet!.publicKey;
    
    const [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
      program.programId
    );

    // Derive the NFT mint PDA
    const [nftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("nft-mint"), eventPda.toBuffer(), ticketOwner.toBuffer()],
      program.programId
    );

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.toBuffer()],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.toBuffer(), Buffer.from("edition")],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [ticketOwner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Account addresses:");
    console.log("  - Event:", eventPda.toString());
    console.log("  - Ticket:", ticketPda.toString());
    console.log("  - NFT Mint:", nftMint.toString());
    console.log("  - Metadata:", metadataPda.toString());
    console.log("  - Master Edition:", masterEditionPda.toString());
    console.log("  - Token Account:", tokenAccountPda.toString());

    // Check if we have enough balance for minting
    console.log("\n🔧 Checking balance for minting (if needed by RPC provider)...");
    const balance = await provider.connection.getBalance(provider.wallet!.publicKey);
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log("Insufficient balance for minting. Please fund your wallet or try again later.");
      throw new Error("Insufficient balance for minting");
    }

    // --- Build metadata JSON (respect limits) ---
    const name = "TIX • Concert for NFT Minting • A1".slice(0, 32);
    const symbol = "TIX".slice(0, 10);
    const description = "Entry ticket";
    const attributes = [
      { trait_type: "Event", value: eventName },
      { trait_type: "Seat", value: "A1" },
      { trait_type: "Stage", value: "QR" },
    ];

    // (Optional) upload an image to Arweave first
    console.log("BUNDLR_SOLANA_SECRET_KEY_B58:", process.env.BUNDLR_SOLANA_SECRET_KEY_B58);
    const bundlr = await getBundlr(process.env.BUNDLR_SOLANA_SECRET_KEY_B58!);
    // Prepare an image buffer or skip if you don’t want images
    const imagePath = path.join(__dirname, "fixtures", "ticket.png");
    const haveImage = fs.existsSync(imagePath);
    let imageUrl: string | undefined = undefined;

    if (haveImage) {
      const png = fs.readFileSync(imagePath);
      await ensureBundlrFunds(bundlr, png.length + 2048);
      const img = await uploadPngToArweave(bundlr, png);
      imageUrl = img.url; // e.g. https://arweave.net/<imgId>
    }

    const metadata = {
      name,
      symbol,
      description,
      image: imageUrl, // or omit if none
      external_url: `https://example.com/events/${eventPda.toBase58()}`,
      attributes,
      properties: {
        category: "ticket",
        files: imageUrl ? [{ uri: imageUrl, type: "image/png" }] : [],
      },
    };

    const jsonBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
    await ensureBundlrFunds(bundlr, jsonBytes + 2048);
    const { url: arweaveUri } = await uploadJsonToArweave(bundlr, metadata);

    // Log for sanity:
    console.log("Arweave metadata:", arweaveUri);

    // --- Call your instruction with URI override ---
    const tx = await program.methods
      .mintTicket("A1", arweaveUri) // pass override
      .accounts({
        authority: provider.wallet!.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        owner: ticketOwner,
        nftMint: nftMint,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenAccount: tokenAccountPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

      console.log("Ticket minted successfully!");
      console.log("Transaction signature:", tx);
      console.log("NFT Mint:", nftMint.toString());
      console.log("Ticket Owner:", ticketOwner.toString());
      console.log("Ticket Account:", ticketPda.toString());

      // Verify the ticket was created
      const ticketAccount = await program.account.ticketAccount.fetch(ticketPda);
      console.log("Ticket Details:");
      console.log("  - Event:", ticketAccount.event.toString());
      console.log("  - Owner:", ticketAccount.owner.toString());
      console.log("  - Stage:", ticketAccount.stage);
      console.log("  - Seat:", ticketAccount.seat);
      console.log("  - NFT Mint:", ticketAccount.nftMint.toString());
      console.log("  - Is Listed:", ticketAccount.isListed);

  });

  it("List ticket for sale", async () => {
    // 1. Create an event and mint a ticket first
    const eventId = new anchor.BN(Date.now() + Math.random() * 1000 + 2000);
    const eventName = "Concert for Listing Test";
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const endTs = new anchor.BN(Math.floor(Date.now() / 1000) + 7200);
    const seller = provider.wallet!.publicKey;

    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({ organizer: seller, eventAccount: eventPda, systemProgram: SystemProgram.programId })
      .rpc();

    console.log("Event created for listing test");

    const [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), seller.toBuffer()],
      program.programId
    );

    const [nftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("nft-mint"), eventPda.toBuffer(), seller.toBuffer()],
      program.programId
    );
    
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.toBuffer()],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.toBuffer(), Buffer.from("edition")],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [seller.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Mint the ticket (simplified metadata)
    const txMint = await program.methods
    .mintTicket("B2", "https://arweave.net/some-random-uri-for-listing")
    .accounts({
        authority: seller,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        owner: seller,
        nftMint: nftMint,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenAccount: tokenAccountPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        skipPreflight: true
      });
      
    console.log("Ticket minted for listing test:", txMint);

    // 2. Prepare accounts for listing
    const priceLamports = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600 * 24); // 24 hours from now

    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
      program.programId
    );

    const [sellerNftAccount] = PublicKey.findProgramAddressSync(
        [seller.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [escrowNftAccount] = PublicKey.findProgramAddressSync(
        [listingPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("\nAccount addresses for listing:");
    console.log("  - Seller:", seller.toString());
    console.log("  - Ticket:", ticketPda.toString());
    console.log("  - Listing:", listingPda.toString());
    console.log("  - NFT Mint:", nftMint.toString());
    console.log("  - Seller NFT Account:", sellerNftAccount.toString());
    console.log("  - Escrow NFT Account:", escrowNftAccount.toString());

    // 3. Call the list_ticket instruction
    const tx = await program.methods
      .listTicket(priceLamports, expiresAt)
      .accounts({
        seller: seller,
        ticketAccount: ticketPda,
        eventAccount: eventPda,
        listingAccount: listingPda,
        nftMint: nftMint,
        sellerNftAccount: sellerNftAccount,
        escrowNftAccount: escrowNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("\nTicket listed successfully!");
    console.log("Transaction signature:", tx);

    // 4. Verify the state
    const ticketAccount = await program.account.ticketAccount.fetch(ticketPda);
    const listingAccount = await program.account.listingAccount.fetch(listingPda);
    
    console.log("\nVerification:");
    console.log("  - Ticket isListed:", ticketAccount.isListed);
    if (!ticketAccount.isListed) throw new Error("Verification failed: Ticket is not marked as listed.");
    
    console.log("  - Listing Price:", listingAccount.priceLamports.toString());
    if (listingAccount.priceLamports.toString() !== priceLamports.toString()) throw new Error("Verification failed: Listing price mismatch.");

    console.log("  - Listing Seller:", listingAccount.seller.toString());
    if (listingAccount.seller.toString() !== seller.toString()) throw new Error("Verification failed: Seller mismatch.");

    const escrowToken = await provider.connection.getTokenAccountBalance(escrowNftAccount);
    console.log("  - Escrow NFT balance:", escrowToken.value.amount);
    if (escrowToken.value.amount !== "1") throw new Error("Verification failed: NFT not in escrow.");

  });
});