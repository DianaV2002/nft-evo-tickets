import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import dotenv from "dotenv";

dotenv.config();

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { getPinataClient, uploadCompleteNFTToPinataWithTemporaryUrls } from "./helpers/pinata";
import QRCode from "qrcode";
import { assert } from "chai";

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

describe("Ticket Lifecycle Instructions", function() {
  this.timeout(180_000); // 3 minutes
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;
  const authority = (provider.wallet as anchor.Wallet).payer;

  let eventId: anchor.BN;
  let eventPda: PublicKey;
  let scanner: Keypair;
  let ticketOwner: Keypair;
  let ticketPda: PublicKey;
  let nftMint: PublicKey;

  before(async function() {
    await ensureBalance(provider.connection, authority.publicKey, 0.2 * LAMPORTS_PER_SOL);
    
    eventId = new anchor.BN(Date.now() + Math.random() * 1000);
    scanner = Keypair.generate();
    ticketOwner = Keypair.generate();
    
    await ensureBalance(provider.connection, ticketOwner.publicKey, 0.1 * LAMPORTS_PER_SOL);

    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const eventName = "The Main Event";
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago for testing upgrade
    const endTs = new anchor.BN(Math.floor(Date.now() / 1000) - 1800); // 30 mins ago

    console.log("Creating event for lifecycle tests...");
    await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({ organizer: authority.publicKey, eventAccount: eventPda })
      .signers([authority])
      .rpc();
    console.log("Event created:", eventPda.toString());

    console.log("Setting scanner...");
    await program.methods
      .setScanner(scanner.publicKey)
      .accounts({ authority: authority.publicKey, eventAccount: eventPda })
      .signers([authority])
      .rpc();
    console.log("Scanner set:", scanner.publicKey.toString());
  });

  it("mints a new ticket with temporary metadata", async () => {
    const pinataClient = await getPinataClient(process.env.PINATA_JWT!, process.env.PINATA_GATEWAY);
    const imagePath = path.join(__dirname, "fixtures", "ticket.png");
    const png = fs.readFileSync(imagePath);

    const metadata = {
        name: "EvoTicket",
        symbol: "EVO",
        description: "An evolving NFT ticket",
        attributes: [{ trait_type: "Stage", value: "Prestige" }],
    };

    const { temporaryMetadataUrl } = await uploadCompleteNFTToPinataWithTemporaryUrls(pinataClient, png, metadata, 'ticket.png', 30);
    
    [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.publicKey.toBuffer()],
      program.programId
    );
    [nftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("nft-mint"), eventPda.toBuffer(), ticketOwner.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .mintTicket("Gen-Admin", temporaryMetadataUrl)
      .accounts({
        authority: authority.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        owner: ticketOwner.publicKey,
        nftMint: nftMint,
      })
      .signers([authority])
      .rpc();
      
    console.log("Mint transaction:", tx);
    const account = await program.account.ticketAccount.fetch(ticketPda);
    assert.ok(account.owner.equals(ticketOwner.publicKey), "Ticket owner mismatch");
    assert.deepStrictEqual(account.stage, { prestige: {} }, "Initial stage should be Prestige");
  });

  it("updates the ticket to QR stage by authority", async () => {
    await program.methods
      .updateTicket({ qr: {} })
      .accounts({
        signer: authority.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        authority: authority.publicKey,
        scanner: scanner.publicKey,
      })
      .signers([authority])
      .rpc();

    const account = await program.account.ticketAccount.fetch(ticketPda);
    assert.deepStrictEqual(account.stage, { qr: {} }, "Stage should be QR");
  });

  it("fails to update to QR stage if signer is not authority", async () => {
    try {
      await program.methods
        .updateTicket({ qr: {} })
        .accounts({
          signer: scanner.publicKey, // Wrong signer
          eventAccount: eventPda,
          ticketAccount: ticketPda,
          authority: authority.publicKey,
          scanner: scanner.publicKey,
        })
        .signers([scanner])
        .rpc();
      assert.fail("Transaction should have failed");
    } catch (err) {
      assert.include(err.toString(), "Unauthorized", "Error should be Unauthorized");
    }
  });

  it("updates the ticket to Scanned stage by scanner", async () => {
    await program.methods
      .updateTicket({ scanned: {} })
      .accounts({
        signer: scanner.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        authority: authority.publicKey,
        scanner: scanner.publicKey,
      })
      .signers([scanner])
      .rpc();

    const account = await program.account.ticketAccount.fetch(ticketPda);
    assert.deepStrictEqual(account.stage, { scanned: {} }, "Stage should be Scanned");
    assert.isTrue(account.wasScanned, "wasScanned should be true");
  });

  it("fails to update to Scanned stage if signer is not scanner", async () => {
    // Reset stage to QR for test
    await program.methods
      .updateTicket({ qr: {} })
      .accounts({ signer: authority.publicKey, eventAccount: eventPda, ticketAccount: ticketPda, authority: authority.publicKey, scanner: scanner.publicKey })
      .signers([authority])
      .rpc();

    try {
      await program.methods
        .updateTicket({ scanned: {} })
        .accounts({
          signer: authority.publicKey, // Wrong signer
          eventAccount: eventPda,
          ticketAccount: ticketPda,
          authority: authority.publicKey,
          scanner: scanner.publicKey,
        })
        .signers([authority])
        .rpc();
      assert.fail("Transaction should have failed");
    } catch (err) {
      assert.include(err.toString(), "Unauthorized", "Error should be Unauthorized");
    }
  });

  it("upgrades the ticket to Collectible", async () => {
    // Ensure ticket is scanned
     await program.methods
      .updateTicket({ scanned: {} })
      .accounts({ signer: scanner.publicKey, eventAccount: eventPda, ticketAccount: ticketPda, authority: authority.publicKey, scanner: scanner.publicKey })
      .signers([scanner])
      .rpc();

    await program.methods
      .upgradeToCollectible()
      .accounts({
        user: ticketOwner.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
      })
      .signers([ticketOwner])
      .rpc();

    const account = await program.account.ticketAccount.fetch(ticketPda);
    assert.deepStrictEqual(account.stage, { collectible: {} }, "Stage should be Collectible");
  });
});
