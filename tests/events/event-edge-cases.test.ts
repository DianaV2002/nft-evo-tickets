import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createEventEdgeCaseTests() {
  describe("Event Edge Cases - Error Handling and Boundary Tests", () => {
    const provider = anchor.getProvider();
    const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;
    let organizer: Keypair;
    let eventPda: PublicKey;

    beforeEach(() => {
      organizer = Keypair.generate();
    });

    it("Should fail when trying to create duplicate event for same organizer", async () => {
      // Airdrop SOL to the organizer
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventData = {
        name: "Duplicate Event",
        description: "First event",
        date: new anchor.BN(Date.now() / 1000),
        location: "Test Location",
        ticketPrice: new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL),
      };

      // Create first event successfully
      await program.methods
        .createEvent(
          eventData.name,
          eventData.description,
          eventData.date,
          eventData.location,
          eventData.ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Try to create second event with same organizer - should fail
      try {
        await program.methods
          .createEvent(
            "Another Event",
            "Second event",
            eventData.date,
            eventData.location,
            eventData.ticketPrice
          )
          .accounts({
            organizer: organizer.publicKey,
            event: eventPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([organizer])
          .rpc();
        
        expect.fail("Should have failed when creating duplicate event");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });

    it("Should fail with insufficient funds", async () => {
      // Don't airdrop enough SOL for rent
      const smallAirdrop = await provider.connection.requestAirdrop(
        organizer.publicKey,
        100 // Very small amount, insufficient for rent
      );
      await provider.connection.confirmTransaction({ signature: smallAirdrop, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createEvent(
            "Underfunded Event",
            "This should fail",
            new anchor.BN(Date.now() / 1000),
            "Test Location",
            new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL)
          )
          .accounts({
            organizer: organizer.publicKey,
            event: eventPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([organizer])
          .rpc();
        
        expect.fail("Should have failed with insufficient funds");
      } catch (error) {
        expect(error.message).to.include("insufficient");
      }
    });

    it("Should handle maximum ticket price", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      // Test with maximum possible u64 value
      const maxPrice = new anchor.BN("18446744073709551615"); // Max u64
      
      await program.methods
        .createEvent(
          "Expensive Event",
          "Very expensive event",
          new anchor.BN(Date.now() / 1000),
          "Luxury Venue",
          maxPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.ticketPrice.toString()).to.equal(maxPrice.toString());
    });

    it("Should handle past dates", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const pastDate = (Date.now() / 1000) - (30 * 24 * 60 * 60); // 30 days ago
      
      await program.methods
        .createEvent(
          "Past Event",
          "An event that already happened",
          new anchor.BN(pastDate),
          "Historical Venue",
          new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.date.toNumber()).to.be.closeTo(pastDate, 5);
    });

    it("Should handle extreme future dates", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      // Test with a date far in the future (year 2100)
      const extremeFutureDate = new Date("2100-01-01").getTime() / 1000;
      
      await program.methods
        .createEvent(
          "Far Future Event",
          "An event in the distant future",
          new anchor.BN(extremeFutureDate),
          "Future Venue",
          new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.date.toNumber()).to.be.closeTo(extremeFutureDate, 5);
    });

    it("Should handle different organizers creating events", async () => {
      const organizer1 = Keypair.generate();
      const organizer2 = Keypair.generate();

      // Airdrop to both organizers
      await Promise.all([
        provider.connection.requestAirdrop(organizer1.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL),
        provider.connection.requestAirdrop(organizer2.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      ]);

      // Wait for confirmations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get PDAs for both events
      const [event1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer1.publicKey.toBuffer()],
        program.programId
      );

      const [event2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer2.publicKey.toBuffer()],
        program.programId
      );

      // Create events for both organizers
      await program.methods
        .createEvent(
          "Organizer 1 Event",
          "Event by first organizer",
          new anchor.BN(Date.now() / 1000),
          "Venue 1",
          new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer1.publicKey,
          event: event1Pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer1])
        .rpc();

      await program.methods
        .createEvent(
          "Organizer 2 Event",
          "Event by second organizer",
          new anchor.BN(Date.now() / 1000),
          "Venue 2",
          new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer2.publicKey,
          event: event2Pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer2])
        .rpc();

      // Verify both events exist and have correct data
      const event1Account = await program.account.event.fetch(event1Pda);
      const event2Account = await program.account.event.fetch(event2Pda);

      expect(event1Account.name).to.equal("Organizer 1 Event");
      expect(event1Account.organizer.toBase58()).to.equal(organizer1.publicKey.toBase58());
      
      expect(event2Account.name).to.equal("Organizer 2 Event");
      expect(event2Account.organizer.toBase58()).to.equal(organizer2.publicKey.toBase58());
    });
  });
}