import * as anchor from "@coral-xyz/anchor";
import { Program, web3, } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { expect, assert } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export function createTicketCreationTests() {
  describe("Ticket Creation - Basic Functionality", () => {
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

    it("Should buy a ticket successfully", async () => {
      // Airdrop SOL to organizer and buyer
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          200 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          200 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create event first
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Test Concert";
      const eventDescription = "An amazing test concert event";
      const eventDate = new anchor.BN(Date.now() / 1000);
      const eventLocation = "Test Venue";
      const ticketPrice = new anchor.BN(50 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          eventName,
          eventDescription,
          eventDate,
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

      // Now buy a ticket
      const purchaseDate =  new anchor.BN(Date.now() / 1000);

      const tx = await program.methods
        .buyTicket(purchaseDate)
        .accounts({
          ticket: ticketKeypair.publicKey,
          event: eventPda,
          owner: buyer.publicKey,
          organizer: organizer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer, ticketKeypair])
        .rpc();

      // Fetch the created ticket account
      const ticketAccount = await program.account.ticket.fetch(ticketKeypair.publicKey);

      // Verify the ticket data
      expect(ticketAccount.event.toBase58()).to.equal(eventPda.toBase58());
      expect(ticketAccount.price.toNumber()).to.equal(ticketPrice.toNumber());
      expect(ticketAccount.dateOfPurchase.toNumber()).to.be.closeTo(purchaseDate.toNumber(), 5);
      expect(ticketAccount.owner.toBase58()).to.equal(buyer.publicKey.toBase58());

      console.log("Ticket purchased successfully with signature:", tx);
    });

    it("Should handle free ticket purchase", async () => {
      // Airdrop SOL to organizer and buyer
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          1 * anchor.web3.LAMPORTS_PER_SOL
        ),
        provider.connection.requestAirdrop(
          buyer.publicKey,
          1 * anchor.web3.LAMPORTS_PER_SOL
        )
      ]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create free event
      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizer.publicKey.toBuffer()],
        program.programId
      );

      const eventName = "Free Concert";
      const eventDescription = "A free concert event";
      const eventDate = new anchor.BN(Date.now() / 1000);
      const eventLocation = "Community Center";
      const ticketPrice = new anchor.BN(0); // Free event

      await program.methods
        .createEvent(
          eventName,
          eventDescription,
          eventDate,
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

      // Buy free ticket
      const purchaseDate = new anchor.BN(Date.now() / 1000);

      await program.methods
        .buyTicket(purchaseDate)
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
      expect(ticketAccount.price.toNumber()).to.equal(0);
    });

    it("Should verify payment transfer to organizer", async () => {
      // Airdrop SOL to organizer and buyer
      await Promise.all([
        provider.connection.requestAirdrop(
          organizer.publicKey,
          1 * anchor.web3.LAMPORTS_PER_SOL
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

      const ticketPrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .createEvent(
          "Paid Concert",
          "A concert requiring payment",
          new anchor.BN(Date.now() / 1000),
          "Venue",
          ticketPrice
        )
        .accounts({
          organizer: organizer.publicKey,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([organizer])
        .rpc();

      // Get initial balances
      const initialOrganizerBalance = await provider.connection.getBalance(organizer.publicKey);
      const initialBuyerBalance = await provider.connection.getBalance(buyer.publicKey);

      // Buy ticket
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

      // Check final balances
      const finalOrganizerBalance = await provider.connection.getBalance(organizer.publicKey);
      const finalBuyerBalance = await provider.connection.getBalance(buyer.publicKey);

      // Organizer should receive the ticket price
      expect(finalOrganizerBalance).to.be.greaterThan(initialOrganizerBalance);
      // Buyer should have less (ticket price + transaction fees)
      expect(finalBuyerBalance).to.be.lessThan(initialBuyerBalance - ticketPrice.toNumber());
    });
  });
}