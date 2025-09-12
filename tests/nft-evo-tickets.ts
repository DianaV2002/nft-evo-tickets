import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEvoTickets } from "../target/types/nft_evo_tickets";
import { runAllEventTests } from "./events";
import { runAllTicketTests } from "./tickets";

describe("nft-evo-tickets", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.nftEvoTickets as Program<NftEvoTickets>;

  it("Should initialize the program", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Program initialized with signature:", tx);
  });

  runAllEventTests();
  runAllTicketTests();
});
