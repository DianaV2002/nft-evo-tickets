import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createTicketValidationTests() {
  describe("Ticket Validation - Error Handling", () => {
    const provider = anchor.getProvider();
    const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;
    let organizer: Keypair;
    let buyer: Keypair;
    let eventPda: PublicKey;
    let ticketKeypair: Keypair;
    let wrongOrganizer: Keypair;

    beforeEach(() => {
      organizer = Keypair.generate();
      buyer = Keypair.generate();
      ticketKeypair = Keypair.generate();
      wrongOrganizer = Keypair.generate();
    });

    it("Should fail when using wrong organizer account", async () => {
      // Airdrop SOL
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
          wrongOrganizer.publicKey,
          1 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event with correct organizer
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createEvent(
          "Test Event",
          "Test Description",
          new anchor.BN(Date.now() / 1000),
          "Test Location",
          new anchor.BN(1000000) // 0.001 SOL
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Try to buy ticket with wrong organizer
      try {
        await program.methods
          .buyTicket(new anchor.BN(Date.now() / 1000))
          .accounts({
            ticket: ticketKeypair.publicKey,
            event: eventPda,
            owner: buyer.publicKey,
            organizer: wrongOrganizer.publicKey, // Wrong organizer!
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer, ticketKeypair])
          .rpc();
        
        expect.fail("Expected transaction to fail with wrong organizer");
      } catch (error) {
        expect(error.message).to.include("CreateTicketInvalidOrganizer");
      }
    });

    it("Should fail when buyer has insufficient funds", async () => {
      // Airdrop minimal SOL to buyer (not enough for expensive ticket)
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          0.001 * anchor.web3.LAMPORTS_PER_SOL // Very small amount
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create expensive event
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createEvent(
          "Expensive Event",
          "Very expensive event",
          new anchor.BN(Date.now() / 1000),
          "Luxury Venue",
          new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL) // Very expensive
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Try to buy expensive ticket with insufficient funds
      try {
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
        
        expect.fail("Expected transaction to fail with insufficient funds");
      } catch (error) {
        expect(error.message).to.include("insufficient");
      }
    });

    it("Should fail when trying to use same ticket account twice", async () => {
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
          "Test Event",
          "Test Description",
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

      // Buy first ticket successfully
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

      // Try to use the same ticket account again
      try {
        await program.methods
          .buyTicket(new anchor.BN(Date.now() / 1000))
          .accounts({
            ticket: ticketKeypair.publicKey, // Same ticket account!
            event: eventPda,
            owner: buyer.publicKey,
            organizer: organizer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer, ticketKeypair])
          .rpc();
        
        expect.fail("Expected transaction to fail with duplicate ticket account");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });

    it.skip("Should fail when trying to buy ticket for non-existent event", async () => {
      // Airdrop SOL
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          1 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a fake event PDA that doesn't exist
      const [fakeEventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), Keypair.generate().publicKey.toBuffer()],
        program.programId
      );

      // Try to buy ticket for non-existent event
      try {
        await program.methods
          .buyTicket(new anchor.BN(Date.now() / 1000))
          .accounts({
            ticket: ticketKeypair.publicKey,
            event: fakeEventPda, // Non-existent event
            owner: buyer.publicKey,
            organizer: organizer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer, ticketKeypair])
          .rpc();
        
        expect.fail("Expected transaction to fail with non-existent event");
      } catch (error) {
        expect(error.message).to.include("does not exist");
      }
    });
  });
}