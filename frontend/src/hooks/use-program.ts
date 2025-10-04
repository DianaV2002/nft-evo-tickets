import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/anchor-idl/nft_evo_tickets.json";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = (() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed'
      });
      return new Program(idl as Idl, provider);
    }
    return null;
  })();

  return { program, wallet, connection };
}