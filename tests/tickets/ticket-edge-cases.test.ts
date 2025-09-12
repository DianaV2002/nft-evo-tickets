import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createTicketEdgeCaseTests() {
  describe("Ticket Edge Cases - Boundary Conditions", () => {
    const provider = anchor.getProvider();
    const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;
    let organizer: Keypair;
    let buyer: Keypair;
    let eventPda: PublicKey;
    let ticketKeypair: Keypair;

    beforeEach(() => {
      organizer = Keypair.generate();
      buyer = Keypair.generate();
      ticketKeypair = Keypair.generate();
    });

    it("Should handle maximum ticket price", async () => {
      // Airdrop large amounts of SOL
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          100 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event with very high ticket price
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const maxPrice = new anchor.BN(50 * anchor.web3.LAMPORTS_PER_SOL); // High but reasonable price

      await program.methods
        .createEvent(
          "Premium Event",
          "Very expensive premium event",
          new anchor.BN(Date.now() / 1000),
          "Exclusive Venue",
          maxPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Buy expensive ticket
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      const ticketAccount = await program.account.ticket.fetch(ticketKeypair.publicKey);
      expect(ticketAccount.price.toNumber()).to.equal(maxPrice.toNumber());
    });

    it("Should handle past event dates", async () => {
      // Airdrop SOL
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event with past date
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const pastDate = new anchor.BN((Date.now() / 1000) - (30 * 24 * 60 * 60)); // 30 days ago
      const ticketPrice =  new anchor.BN(1000000)// 0.001 SOL
      await program.methods
        .createEvent(
          "Past Event",
          "Event that already happened",
          pastDate,
          "Historical Venue",
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Should still be able to buy ticket (program doesn't validate date)
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      const ticketAccount = await program.account.ticket.fetch(ticketKeypair.publicKey);
      expect(ticketAccount.event.toBase58()).to.equal(eventPda.toBase58());
    });

    it("Should handle multiple tickets for same event by different buyers", async () => {
      const buyer2 = Keypair.generate();
      const ticketKeypair2 = Keypair.generate();

      // Airdrop SOL to all parties
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer2.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );
      const ticketPrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      await program.methods
        .createEvent(
          "Multi-Ticket Event",
          "Event allowing multiple tickets",
          new anchor.BN(Date.now() / 1000),
          "Large Venue",
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Buy first ticket
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      // Buy second ticket with different buyer and ticket account
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair2.publicKey,
          event: eventPda,
          owner: buyer2.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer2, ticketKeypair2])
        .rpc();

      // Verify both tickets exist and have correct owners
      const ticket1 = await program.account.ticket.fetch(ticketKeypair.publicKey);
      const ticket2 = await program.account.ticket.fetch(ticketKeypair2.publicKey);

      expect(ticket1.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
      expect(ticket2.owner.toBase58()).to.equal(buyer2.publicKey.toBase58());
      expect(ticket1.event.toBase58()).to.equal(eventPda.toBase58());
      expect(ticket2.event.toBase58()).to.equal(eventPda.toBase58());
    });

    it("Should handle same buyer purchasing multiple tickets for same event", async () => {
      const ticketKeypair2 = Keypair.generate();

      // Airdrop SOL
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          5 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createEvent(
          "Multi-Purchase Event",
          "Event allowing multiple purchases by same buyer",
          new anchor.BN(Date.now() / 1000),
          "Venue",
          new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Buy first ticket
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      // Buy second ticket with same buyer but different ticket account
      await program.methods
        .buyTicket(new anchor.BN(Date.now() / 1000))
        .accounts({
          ticket: ticketKeypair2.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair2])
        .rpc();

      // Verify both tickets belong to same buyer
      const ticket1 = await program.account.ticket.fetch(ticketKeypair.publicKey);
      const ticket2 = await program.account.ticket.fetch(ticketKeypair2.publicKey);

      expect(ticket1.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
      expect(ticket2.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
      expect(ticket1.event.toBase58()).to.equal(eventPda.toBase58());
      expect(ticket2.event.toBase58()).to.equal(eventPda.toBase58());
    });

    it("Should handle purchase timestamps correctly", async () => {
      // Airdrop SOL
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createEvent(
          "Timestamp Event",
          "Event for testing timestamps",
          new anchor.BN(Date.now() / 1000),
          "Venue",
          new anchor.BN(1000000)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Use a specific purchase timestamp
      const customPurchaseDate = new anchor.BN((Date.now() / 1000) - 3600); // 1 hour ago

      await program.methods
        .buyTicket(customPurchaseDate)
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      const ticketAccount = await program.account.ticket.fetch(ticketKeypair.publicKey);
      expect(ticketAccount.dateOfPurchase.toNumber()).to.equal(customPurchaseDate.toNumber());
    });
  });
}