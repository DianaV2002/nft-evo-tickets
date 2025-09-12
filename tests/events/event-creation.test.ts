import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createEventCreationTests() {
  describe("Event Creation - Basic Functionality", () => {
    const provider = anchor.getProvider();
    const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;
    let organizer: Keypair;
    let eventPda: PublicKey;

    beforeEach(() => {
      organizer = Keypair.generate();
    });

    it("Should create an event successfully", async () => {
      // Airdrop SOL to the organizer for transaction fees
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      // Derive the PDA for the event account
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Test Concert";
      const eventDescription = "An amazing test concert event";
      const eventDate = Date.now() / 1000;
      const eventLocation = "Test Venue";
      const ticketPrice = new anchor.BN(50 * anchor.web3.LAMPORTS_PER_SOL);

      const tx = await program.methods
        .createEvent(
          eventName,
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

      // Fetch the created event account
      const eventAccount = await program.account.event.fetch(eventPda);

      // Verify the event data
      expect(eventAccount.name).to.equal(eventName);
      expect(eventAccount.description).to.equal(eventDescription);
      expect(eventAccount.date.toNumber()).to.be.closeTo(eventDate, 5);
      expect(eventAccount.location).to.equal(eventLocation);
      expect(eventAccount.ticketPrice.toNumber()).to.equal(ticketPrice.toNumber());
      expect(eventAccount.organizer.toBase58()).to.equal(organizer.publicKey.toBase58());

      console.log("Event created successfully with signature:", tx);
    });

    it("Should handle zero ticket price (free events)", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Free Event";
      const eventDescription = "A free event for everyone";
      const eventDate = Date.now() / 1000;
      const eventLocation = "Community Center";
      const ticketPrice = new anchor.BN(0);

      await program.methods
        .createEvent(
          eventName,
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
      expect(eventAccount.ticketPrice.toNumber()).to.equal(0);
    });

    it("Should handle future dates", async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        organizer.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({ signature: airdropSignature, ...(await provider.connection.getLatestBlockhash()) });

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Future Event";
      const eventDescription = "An event happening in the future";
      const futureDate = (Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
      const eventLocation = "Future Venue";
      const ticketPrice = new anchor.BN(25 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          eventName,
          eventDescription,
          new anchor.BN(futureDate),
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
      expect(eventAccount.date.toNumber()).to.be.closeTo(futureDate, 5);
    });
  });
}