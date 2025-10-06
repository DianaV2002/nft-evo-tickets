import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftEvoTickets as Program<NftEvoTickets>;

  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  // Generate a unique event ID based on timestamp
  const eventId = new anchor.BN(Date.now());

  // Event details
  const eventName = "NFT Evolution Summit 2025";
  const now = Math.floor(Date.now() / 1000);
  const startTs = new anchor.BN(now + 86400); // Tomorrow
  const endTs = new anchor.BN(now + 90000); // ~1 hour after start

  // Derive the event PDA
  const [eventPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("nft-evo-tickets"),
      Buffer.from("event"),
      eventId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  console.log("\nCreating event:");
  console.log("  Event ID:", eventId.toString());
  console.log("  Name:", eventName);
  console.log("  Start:", new Date(startTs.toNumber() * 1000).toISOString());
  console.log("  End:", new Date(endTs.toNumber() * 1000).toISOString());
  console.log("  Event PDA:", eventPda.toString());

  try {
    const tx = await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({
        organizer: provider.wallet.publicKey,
        eventAccount: eventPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Event created successfully!");
    console.log("Transaction signature:", tx);
    console.log("\nEvent account:", eventPda.toString());
  } catch (error) {
    console.error("\n❌ Error creating event:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
