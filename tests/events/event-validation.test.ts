import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createEventValidationTests() {
  describe("Event Validation - Data Limits and Constraints", () => {
    const provider = anchor.getProvider();
    const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;
    let organizer: Keypair;
    let eventPda: PublicKey;

    beforeEach(() => {
      organizer = Keypair.generate();
    });

    it("Should handle maximum length event names", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const longEventName = "A".repeat(50); // Max length according to the account structure
      const eventDescription = "Test event with long name";
      const eventDate = Date.now() / 1000;
      const eventLocation = "Test Location";
      const ticketPrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          longEventName,
          eventDescription,
          new anchor.BN(eventDate),
          eventLocation,
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.name).to.equal(longEventName);
    });

    it.skip("Should handle long descriptions", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Long Description Event";
      const longDescription = "A".repeat(1900); // Safe length under the 2000 byte limit
      const eventDate = Date.now() / 1000;
      const eventLocation = "Test Location";
      const ticketPrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          eventName,
          longDescription,
          new anchor.BN(eventDate),
          eventLocation,
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.description).to.equal(longDescription);
    });

    it("Should handle maximum length locations", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Location Test Event";
      const eventDescription = "Testing max location length";
      const eventDate = Date.now() / 1000;
      const longLocation = "B".repeat(50); // Max length for location
      const ticketPrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          eventName,
          eventDescription,
          new anchor.BN(eventDate),
          longLocation,
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.location).to.equal(longLocation);
    });

    it("Should handle empty strings gracefully", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      // Test with empty strings
      await program.methods
        .createEvent(
          "", // Empty name
          "", // Empty description
          new anchor.BN(Date.now() / 1000),
          "", // Empty location
          new anchor.BN(0)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.name).to.equal("");
      expect(eventAccount.description).to.equal("");
      expect(eventAccount.location).to.equal("");
    });

    it("Should handle special characters in text fields", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const specialCharsName = "Événement Spécial! @#$%^&*()";
      const specialCharsDesc = "Description with émojis 🎵🎤 and symbols: ñáéíóú";
      const specialCharsLocation = "Café & Théâtre 'Le Français'";
      
      await program.methods
        .createEvent(
          specialCharsName,
          specialCharsDesc,
          new anchor.BN(Date.now() / 1000),
          specialCharsLocation,
          new anchor.BN(5 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.name).to.equal(specialCharsName);
      expect(eventAccount.description).to.equal(specialCharsDesc);
      expect(eventAccount.location).to.equal(specialCharsLocation);
    });
  });
}