import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../../target/types/nft_evo_tickets";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";

describe("Buy Ticket - Simple Test", function() {
  this.timeout(120_000);

  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;

  it("Buy a listed ticket", async () => {
    console.log("\n Starting Buy Ticket Test\n");

    // Load seller keypair and set buyer to your wallet
    const sellerSecret = JSON.parse(fs.readFileSync("tests/fixtures/seller.json", "utf-8"));
    const seller = Keypair.fromSecretKey(Uint8Array.from(sellerSecret));

    // Buyer is your main wallet
    const buyerWalletPath = process.env.ANCHOR_WALLET || "/home/g/.config/solana/id.json";
    const buyerSecret = JSON.parse(fs.readFileSync(buyerWalletPath, "utf-8"));
    const buyer = Keypair.fromSecretKey(Uint8Array.from(buyerSecret));

    console.log("👤 Seller:", seller.publicKey.toString());
    console.log("👤 Buyer:", buyer.publicKey.toString());

    // STEP 1: Create an event
    console.log("\n1️⃣ Creating event...");
    const eventId = new anchor.BN(Date.now());
    const eventName = "Simple Buy Test Concert";
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const endTs = new anchor.BN(Math.floor(Date.now() / 1000) + 7200);

    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({
        organizer: seller.publicKey,
        eventAccount: eventPda,
        systemProgram: SystemProgram.programId
      })
      .signers([seller])
      .rpc();

    console.log("✅ Event created:", eventPda.toString());

    // STEP 2: Mint a ticket
    console.log("\n2️⃣ Minting ticket...");
    const [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), seller.publicKey.toBuffer()],
      program.programId
    );

    const [nftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("nft-mint"), eventPda.toBuffer(), seller.publicKey.toBuffer()],
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
      [seller.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await program.methods
      .mintTicket("A1", "https://example.com/metadata.json")
      .accounts({
        authority: seller.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        owner: seller.publicKey,
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
      .signers([seller])
      .rpc({ skipPreflight: true });

    console.log("✅ Ticket minted:", ticketPda.toString());

    // STEP 3: Update ticket to QR stage (required before listing)
    console.log("\n3️⃣ Setting up ticket for listing...");
    const scanner = Keypair.generate();

    await program.methods
      .setScanner(scanner.publicKey)
      .accounts({ authority: seller.publicKey, eventAccount: eventPda })
      .signers([seller])
      .rpc();

    await program.methods
      .updateTicket({ qr: {} })
      .accounts({
        signer: seller.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        authority: seller.publicKey,
        scanner: scanner.publicKey,
      })
      .signers([seller])
      .rpc();

    console.log("✅ Ticket ready for listing");

    // STEP 4: List the ticket
    console.log("\n4️⃣ Listing ticket for 0.1 SOL...");
    const priceLamports = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
      program.programId
    );

    const [sellerNftAccount] = PublicKey.findProgramAddressSync(
      [seller.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [escrowNftAccount] = PublicKey.findProgramAddressSync(
      [listingPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await program.methods
      .listTicket(priceLamports, null)
      .accounts({
        seller: seller.publicKey,
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
      .signers([seller])
      .rpc();

    console.log("✅ Ticket listed for 0.1 SOL");
    console.log("   Listing PDA:", listingPda.toString());

    // STEP 5: BUY THE TICKET! 🎉
    console.log("\n5️⃣ 🛒 BUYING TICKET...\n");

    const [buyerNftAccount] = PublicKey.findProgramAddressSync(
      [buyer.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sellerBalanceBefore = await provider.connection.getBalance(seller.publicKey);
    const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

    const tx = await program.methods
      .buyTicket()
      .accounts({
        buyer: buyer.publicKey,
        ticketAccount: ticketPda,
        listingAccount: listingPda,
        eventAccount: eventPda,
        seller: seller.publicKey,
        nftMint: nftMint,
        escrowNftAccount: escrowNftAccount,
        buyerNftAccount: buyerNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer])
      .rpc();

    console.log("✅ PURCHASE SUCCESSFUL! 🎉");
    console.log("\n📝 Transaction Details:");
    console.log("   Signature:", tx);
    console.log("   View on Solscan: https://solscan.io/tx/" + tx + "?cluster=devnet");

    // Verify the purchase
    console.log("\n🔍 Verifying purchase...");

    const ticketAccount = await program.account.ticketAccount.fetch(ticketPda);
    const buyerTokenAccount = await provider.connection.getTokenAccountBalance(buyerNftAccount);
    const sellerBalanceAfter = await provider.connection.getBalance(seller.publicKey);
    const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);

    console.log("\n✅ Verification Results:");
    console.log("   ✓ New owner:", ticketAccount.owner.toString());
    console.log("   ✓ Buyer has NFT:", buyerTokenAccount.value.amount, "tokens");
    console.log("   ✓ Ticket is no longer listed:", !ticketAccount.isListed);
    console.log("\n💰 Balance Changes:");
    console.log("   Seller before:", (sellerBalanceBefore / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    console.log("   Seller after:", (sellerBalanceAfter / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    console.log("   Seller gained:", ((sellerBalanceAfter - sellerBalanceBefore) / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    console.log("\n   Buyer before:", (buyerBalanceBefore / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    console.log("   Buyer after:", (buyerBalanceAfter / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    console.log("   Buyer paid:", ((buyerBalanceBefore - buyerBalanceAfter) / LAMPORTS_PER_SOL).toFixed(4), "SOL");

    // Assertions
    if (ticketAccount.owner.toString() !== buyer.publicKey.toString()) {
      throw new Error("❌ Ticket ownership not transferred!");
    }
    if (buyerTokenAccount.value.amount !== "1") {
      throw new Error("❌ NFT not in buyer's account!");
    }
    if (ticketAccount.isListed) {
      throw new Error("❌ Ticket still listed!");
    }
    if (sellerBalanceAfter <= sellerBalanceBefore) {
      throw new Error("❌ Seller didn't receive payment!");
    }

    console.log("\n🎉 ALL CHECKS PASSED! Ticket successfully purchased!\n");
  });
});
