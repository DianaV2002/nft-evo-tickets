import * as anchor from "@coral-xyz/anchor";

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());

export const provider = anchor.AnchorProvider.env();
export const program = anchor.workspace.NftEvoTickets as anchor.Program<anchor.Idl>;
