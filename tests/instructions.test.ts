import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

describe("Instructions (programs) Tests", function() {
  // to run them: yarn test:instructions
  this.timeout(60_000);
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;
  const provider = anchor.getProvider();

  describe("Initialize", () => {
    it("should initialize successfully", async () => {
      const tx = await program.methods.initialize().rpc();
      expect(tx).to.be.a("string");
    });
  });

  describe("Create Event", () => {
    it("should create an event with valid parameters", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200); // 2 hours from now

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .createEvent(eventId, eventName, startTs, endTs)
        .accounts({
          organizer: provider.wallet!.publicKey,
          eventAccount: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda);
      expect(eventAccount.eventId.toString()).to.equal(eventId.toString());
      expect(eventAccount.name).to.equal(eventName);
      expect(eventAccount.authority.toString()).to.equal(provider.wallet!.publicKey.toString());
    });

    it("should fail with name longer than 64 characters", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "a".repeat(65); // 65 characters
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        await program.methods
          .createEvent(eventId, eventName, startTs, endTs)
          .accounts({
            organizer: provider.wallet!.publicKey,
            eventAccount: eventPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("Invalid input parameter");
      }
    });

    it("should fail when end_ts is before start_ts", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 7200);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 3600); // Before start

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        await program.methods
          .createEvent(eventId, eventName, startTs, endTs)
          .accounts({
            organizer: provider.wallet!.publicKey,
            eventAccount: eventPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("Invalid input parameter");
      }
    });

    it("should fail when event starts in the past", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) - 3600); // In the past
      const endTs = new BN(Math.floor(Date.now() / 1000) + 3600);

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        await program.methods
          .createEvent(eventId, eventName, startTs, endTs)
          .accounts({
            organizer: provider.wallet!.publicKey,
            eventAccount: eventPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("Invalid input parameter");
      }
    });
  });

  describe("Mint Ticket", () => {
    let eventPda: PublicKey;
    let eventId: BN;

    beforeEach(async () => {
      // Create an event for ticket minting
      eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Mint Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .createEvent(eventId, eventName, startTs, endTs)
        .accounts({
          organizer: provider.wallet!.publicKey,
          eventAccount: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should mint a ticket successfully", async () => {
      const ticketOwner = provider.wallet!.publicKey;
      const seat = "A1";

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
        program.programId
      );

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

      const tokenAccountPda = await getAssociatedTokenAddress(nftMint, ticketOwner);

      await program.methods
        .mintTicket(seat, null)
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

      const ticketAccount = await program.account.ticketAccount.fetch(ticketPda);
      expect(ticketAccount.owner.toString()).to.equal(ticketOwner.toString());
      expect(ticketAccount.seat).to.equal(seat);
      expect(ticketAccount.isListed).to.be.false;
    });

    it("should fail when non-authority tries to mint", async () => {
      const unauthorizedUser = Keypair.generate();

      // Fund the unauthorized user by transferring from main wallet
      const tx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.wallet!.publicKey,
          toPubkey: unauthorizedUser.publicKey,
          lamports: 100_000_000, // 0.1 SOL
        })
      );
      await provider.sendAndConfirm(tx);

      const ticketOwner = provider.wallet!.publicKey;

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
        program.programId
      );

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

      const tokenAccountPda = await getAssociatedTokenAddress(nftMint, ticketOwner);

      try {
        await program.methods
          .mintTicket("B1", null)
          .accounts({
            authority: unauthorizedUser.publicKey,
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
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("ConstraintHasOne");
      }
    });
  });

  describe("List Ticket", () => {
    let eventPda: PublicKey;
    let ticketPda: PublicKey;
    let nftMint: PublicKey;
    let ticketOwner: PublicKey;

    beforeEach(async () => {
      // Create event and mint ticket
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "List Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

      [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .createEvent(eventId, eventName, startTs, endTs)
        .accounts({
          organizer: provider.wallet!.publicKey,
          eventAccount: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      ticketOwner = provider.wallet!.publicKey;

      [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
        program.programId
      );

      [nftMint] = PublicKey.findProgramAddressSync(
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

      const tokenAccountPda = await getAssociatedTokenAddress(nftMint, ticketOwner);

      await program.methods
        .mintTicket("C1", null)
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
    });

    it("should fail listing a ticket in QR stage", async () => {
      const price = new BN(1_000_000_000); // 1 SOL
      const expiresAt = new BN(Math.floor(Date.now() / 1000) + 86400); // 1 day from now

      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
        program.programId
      );

      const sellerNftAccount = await getAssociatedTokenAddress(nftMint, ticketOwner);
      const escrowNftAccount = await getAssociatedTokenAddress(nftMint, listingPda, true);

      try {
        await program.methods
          .listTicket(price, expiresAt)
          .accounts({
            seller: ticketOwner,
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
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("CannotListInCurrentStage");
      }
    });

    it("should fail when non-owner tries to list", async () => {
      const unauthorizedUser = Keypair.generate();

    // Fund the unauthorized user by transferring from main wallet
      const tx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.wallet!.publicKey,
          toPubkey: unauthorizedUser.publicKey,
          lamports: 100_000_000, // 0.1 SOL
        })
      );
      await provider.sendAndConfirm(tx);

      const price = new BN(1_000_000_000);

      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
        program.programId
      );

      const sellerNftAccount = await getAssociatedTokenAddress(nftMint, ticketOwner);
      const escrowNftAccount = await getAssociatedTokenAddress(nftMint, listingPda, true);

      try {
        await program.methods
          .listTicket(price, null)
          .accounts({
            seller: unauthorizedUser.publicKey,
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
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
         expect(err.message).to.include("Unauthorized");
      }
    });
  });

  describe("Cancel Listing", () => {
    it("should fail when trying to cancel non-existent listing", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Cancel Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .createEvent(eventId, eventName, startTs, endTs)
        .accounts({
          organizer: provider.wallet!.publicKey,
          eventAccount: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const ticketOwner = provider.wallet!.publicKey;

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
        program.programId
      );

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

      const tokenAccountPda = await getAssociatedTokenAddress(nftMint, ticketOwner);

      await program.methods
        .mintTicket("D1", null)
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

      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
        program.programId
      );

      const sellerNftAccount = await getAssociatedTokenAddress(nftMint, ticketOwner);
      const escrowNftAccount = await getAssociatedTokenAddress(nftMint, listingPda, true);

      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: ticketOwner,
            ticketAccount: ticketPda,
            listingAccount: listingPda,
            nftMint: nftMint,
            escrowNftAccount: escrowNftAccount,
            sellerNftAccount: sellerNftAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("AccountNotInitialized.");
      }
    });
  });

  describe("Buy Ticket", () => {
    it("should fail when buying non-listed ticket", async () => {
      const eventId = new BN(Date.now() + Math.random() * 10000);
      const eventName = "Buy Test Event";
      const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
      const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .createEvent(eventId, eventName, startTs, endTs)
        .accounts({
          organizer: provider.wallet!.publicKey,
          eventAccount: eventPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const ticketOwner = provider.wallet!.publicKey;

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("ticket"), eventPda.toBuffer(), ticketOwner.toBuffer()],
        program.programId
      );

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

      const tokenAccountPda = await getAssociatedTokenAddress(nftMint, ticketOwner);

      await program.methods
        .mintTicket("E1", null)
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

      const buyer = Keypair.generate();
      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-evo-tickets"), Buffer.from("listing"), ticketPda.toBuffer()],
        program.programId
      );

      const escrowNftAccount = await getAssociatedTokenAddress(nftMint, listingPda, true);
      const buyerNftAccount = await getAssociatedTokenAddress(nftMint, buyer.publicKey);

      try {
        await program.methods
          .buyTicket()
          .accounts({
            buyer: buyer.publicKey,
            ticketAccount: ticketPda,
            listingAccount: listingPda,
            eventAccount: eventPda,
            seller: ticketOwner,
            nftMint: nftMint,
            escrowNftAccount: escrowNftAccount,
            buyerNftAccount: buyerNftAccount,
            eventAuthority: null,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([buyer])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.include("AccountNotInitialized.");
      }
    });
  });
});
