import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import dotenv from "dotenv";

dotenv.config();

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

async function ensureBalance(conn: Connection, pubkey: PublicKey, wantLamports: number) {
  const bal = await conn.getBalance(pubkey);
  if (bal >= wantLamports) return;

  // backoff + confirm with latest blockhash (more reliable)
  let delay = 500;
  for (let i = 0; i < 6; i++) {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    const sig = await conn.requestAirdrop(pubkey, wantLamports - bal);
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed")
      .catch(() => {});
    const now = await conn.getBalance(pubkey);
    if (now >= wantLamports) return;
    await new Promise(r => setTimeout(r, delay));
    delay *= 2;
  }
  throw new Error("Airdrop failed after retries");
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
    // The mint account will be created by the program, we just need the address
    const nftMint = Keypair.generate();

    const [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
      program.programId
    );

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.publicKey.toBuffer()],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [ticketOwner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Account addresses:");
    console.log("  - Event:", eventPda.toString());
    console.log("  - Ticket:", ticketPda.toString());
    console.log("  - NFT Mint:", nftMint.publicKey.toString());
    console.log("  - Metadata:", metadataPda.toString());
    console.log("  - Master Edition:", masterEditionPda.toString());
    console.log("  - Token Account:", tokenAccountPda.toString());

    // First, create the mint account
    console.log("\n🔧 Creating mint account...");
    const createMintTx = await provider.connection.requestAirdrop(provider.wallet!.publicKey, 1000000000); // 1 SOL
    await provider.connection.confirmTransaction(createMintTx);

    try {
      const tx = await program.methods
        .mintTicket("A1")
        .accounts({
          authority: provider.wallet!.publicKey,
          eventAccount: eventPda,
          ticketAccount: ticketPda,
          owner: ticketOwner,
          nftMint: nftMint.publicKey,
          metadata: metadataPda,
          masterEdition: masterEditionPda,
          tokenAccount: tokenAccountPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([nftMint])
        .rpc();

      console.log("Ticket minted successfully!");
      console.log("Transaction signature:", tx);
      console.log("NFT Mint:", nftMint.publicKey.toString());
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

    } catch (error) {
      console.error("Error minting ticket:", error);
      throw error;
    }
  });
});