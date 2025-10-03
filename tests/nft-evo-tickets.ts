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
import { getPinataClient, uploadCompleteNFTToPinataWithTemporaryUrls } from "./helpers/pinata";
import QRCode from "qrcode";

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

  const provider = anchor.getProvider();

  before(async function() {
    await ensureBalance(provider.connection, provider.wallet!.publicKey, 0.1 * LAMPORTS_PER_SOL);
  });

  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;

  it("Initialize program", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Program initialized: https://solscan.io/tx/" + tx + "?cluster=devnet");
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

    console.log("Event created: https://solscan.io/tx/" + tx + "?cluster=devnet");
    console.log("Event Account: https://solscan.io/account/" + eventPda.toString() + "?cluster=devnet");

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
    console.log("  - Event: https://solscan.io/account/" + eventPda.toString() + "?cluster=devnet");
    console.log("  - Ticket: https://solscan.io/account/" + ticketPda.toString() + "?cluster=devnet");
    console.log("  - NFT Mint: https://solscan.io/account/" + nftMint.toString() + "?cluster=devnet");
    console.log("  - Metadata: https://solscan.io/account/" + metadataPda.toString() + "?cluster=devnet");
    console.log("  - Master Edition: https://solscan.io/account/" + masterEditionPda.toString() + "?cluster=devnet");
    console.log("  - Token Account: https://solscan.io/account/" + tokenAccountPda.toString() + "?cluster=devnet");

    // Check if we have enough balance for minting
    console.log("\n🔧 Checking balance for minting (if needed by RPC provider)...");
    const balance = await provider.connection.getBalance(provider.wallet!.publicKey);
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
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

    // Upload image and metadata to Pinata (IPFS)
    console.log("PINATA_JWT:", process.env.PINATA_JWT ? "[SET]" : "[NOT SET]");

    const pinataClient = await getPinataClient(process.env.PINATA_JWT!, process.env.PINATA_GATEWAY);

    const imagePath = path.join(__dirname, "fixtures", "ticket.png");
    const haveImage = fs.existsSync(imagePath);
    if (!haveImage) {
      throw new Error(`Image file not found at ${imagePath}`);
    }

    const png = fs.readFileSync(imagePath);

    const metadata = {
      name,
      symbol,
      description,
      external_url: `https://example.com/events/${eventPda.toBase58()}`,
      attributes,
    };

    // Upload both image and metadata to Pinata with temporary URLs (20 seconds validity)
    const { imageUrl, metadataUrl, temporaryImageUrl, temporaryMetadataUrl } = await uploadCompleteNFTToPinataWithTemporaryUrls(pinataClient, png, metadata, 'ticket.png', 20);

    console.log("Pinata IPFS URLs:");
    console.log("  Image:", imageUrl);
    console.log("  Metadata:", metadataUrl);
    console.log("Temporary URLs (20s validity):");
    console.log("  Temporary Image:", temporaryImageUrl);
    console.log("  Temporary Metadata:", temporaryMetadataUrl);

    // Generate QR code from metadata URL
    const qrCodeDataUrl = await QRCode.toDataURL(metadataUrl);
    console.log("\nQR Code (as data URL):");
    console.log(qrCodeDataUrl);

    // Save QR code as PNG file
    const qrCodePath = path.join(__dirname, "fixtures", "qr-code.png");
    await QRCode.toFile(qrCodePath, metadataUrl);
    console.log("QR Code saved to:", qrCodePath);

    // --- Call your instruction with temporary metadata URI ---
    const tx = await program.methods
      .mintTicket("A1", temporaryMetadataUrl) // pass temporary Pinata metadata URL
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
      console.log("Transaction signature: https://solscan.io/tx/" + tx + "?cluster=devnet");
      console.log("NFT Mint: https://solscan.io/account/" + nftMint.toString() + "?cluster=devnet");
      console.log("Ticket Owner: https://solscan.io/account/" + ticketOwner.toString() + "?cluster=devnet");
      console.log("Ticket Account: https://solscan.io/account/" + ticketPda.toString() + "?cluster=devnet");

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
});