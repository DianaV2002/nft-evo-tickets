import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram
} from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import NftEvoTicketsIdl from '../frontend/src/anchor-idl/nft_evo_tickets.json';
// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

interface BatchMintConfig {
  eventPda: PublicKey;
  authority: Keypair;
  ticketCount: number;
  batchSize: number;
  retryAttempts: number;
  delayBetweenBatches: number;
}

export class BatchTicketMinter {
  private connection: Connection;
  private program: Program;
  private config: BatchMintConfig;

  constructor(
    connection: Connection,
    program: Program,
    config: BatchMintConfig
  ) {
    this.connection = connection;
    this.program = program;
    this.config = config;
  }

  async mintBatchTickets(): Promise<{
    successful: PublicKey[];
    failed: { ticketIndex: number; error: any }[];
    totalCost: number;
  }> {
    const results = {
      successful: [] as PublicKey[],
      failed: [] as { ticketIndex: number; error: any }[],
      totalCost: 0
    };

    console.log(`Starting batch minting of ${this.config.ticketCount} tickets in batches of ${this.config.batchSize}`);

    for (let i = 0; i < this.config.ticketCount; i += this.config.batchSize) {
      const batchEnd = Math.min(i + this.config.batchSize, this.config.ticketCount);
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;
      
      console.log(`Processing batch ${batchNumber}: tickets ${i + 1}-${batchEnd}`);

      try {
        const batchResults = await this.mintBatch(i, batchEnd);
        results.successful.push(...batchResults.successful);
        results.failed.push(...batchResults.failed);
        results.totalCost += batchResults.cost;

        // Delay between batches to avoid rate limiting
        if (i + this.config.batchSize < this.config.ticketCount) {
          console.log(`Waiting ${this.config.delayBetweenBatches}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
        }
      } catch (error) {
        console.error(`Batch ${batchNumber} failed completely:`, error);
        // Mark all tickets in this batch as failed
        for (let j = i; j < batchEnd; j++) {
          results.failed.push({ ticketIndex: j, error });
        }
      }
    }

    console.log(`Batch minting completed:`);
    console.log(`Successful: ${results.successful.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Total cost: ${results.totalCost} SOL`);

    return results;
  }

  private async mintBatch(startIndex: number, endIndex: number): Promise<{
    successful: PublicKey[];
    failed: { ticketIndex: number; error: any }[];
    cost: number;
  }> {
    const results = {
      successful: [] as PublicKey[],
      failed: [] as { ticketIndex: number; error: any }[],
      cost: 0
    };

    // Process each ticket individually within the batch
    for (let i = startIndex; i < endIndex; i++) {
      let success = false;
      
      for (let attempt = 1; attempt <= this.config.retryAttempts && !success; attempt++) {
        try {
          console.log(`Minting ticket ${i + 1} in batch (attempt ${attempt})`);
          
          // Generate a unique owner for each ticket
          const owner = Keypair.generate().publicKey;
          const ticketMint = await this.mintSingleTicket(i, owner);
          
          results.successful.push(ticketMint);
          results.cost += 0.001; // Approximate cost per ticket
          success = true;
          
        } catch (error) {
          console.error(`Ticket ${i + 1} attempt ${attempt} failed:`, error);
          
          if (attempt === this.config.retryAttempts) {
            results.failed.push({ ticketIndex: i, error });
          } else {
            // Wait before retry
            const delay = attempt * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    return results;
  }

  async mintIndividualTicketsWithRetry(owners?: PublicKey[]): Promise<{
    successful: PublicKey[];
    failed: { ticketIndex: number; error: any }[];
  }> {
    const results = {
      successful: [] as PublicKey[],
      failed: [] as { ticketIndex: number; error: any }[]
    };

    for (let i = 0; i < this.config.ticketCount; i++) {
      let success = false;
      
      for (let attempt = 1; attempt <= this.config.retryAttempts && !success; attempt++) {
        try {
          console.log(`Minting ticket ${i + 1} (attempt ${attempt})`);
          
          // Use provided owner or generate a unique one
          const owner = owners && owners[i] ? owners[i] : Keypair.generate().publicKey;
          const ticketMint = await this.mintSingleTicket(i, owner);
          results.successful.push(ticketMint);
          success = true;
          
        } catch (error) {
          console.error(`Ticket ${i + 1} attempt ${attempt} failed:`, error);
          
          if (attempt === this.config.retryAttempts) {
            results.failed.push({ ticketIndex: i, error });
          } else {
            // Wait before retry
            const delay = attempt * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    return results;
  }

  private async mintSingleTicket(ticketIndex: number, owner: PublicKey): Promise<PublicKey> {
    // Derive PDAs for this ticket
    const [ticketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft-evo-tickets"),
        Buffer.from("ticket"),
        this.config.eventPda.toBuffer(),
        owner.toBuffer()
      ],
      this.program.programId
    );

    const [nftMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft-evo-tickets"),
        Buffer.from("nft-mint"),
        this.config.eventPda.toBuffer(),
        owner.toBuffer()
      ],
      this.program.programId
    );

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.toBuffer(),
        Buffer.from("edition")
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), // TOKEN_PROGRAM_ID
        nftMint.toBuffer()
      ],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") // ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Call the program's mint_ticket instruction
    await this.program.methods
      .mintTicket(`Seat${ticketIndex + 1}`, null)
      .accounts({
        authority: this.config.authority.publicKey,
        eventAccount: this.config.eventPda,
        ticketAccount: ticketPda,
        owner: owner,
        nftMint: nftMint,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenAccount: tokenAccountPda,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
      })
      .signers([this.config.authority])
      .rpc({ skipPreflight: true });

    return nftMint;
  }
}

// Usage example
export async function createBatchMinter(
  connection: Connection,
  eventPda: PublicKey,
  authority: Keypair
): Promise<BatchTicketMinter> {
  // Initialize the program with the IDL
  const provider = new AnchorProvider(
    connection,
    {} as any, // You would pass actual wallet here
    { commitment: 'confirmed' }
  );
  const program = new Program(NftEvoTicketsIdl as any, provider);

  const config: BatchMintConfig = {
    eventPda,
    authority,
    ticketCount: 100, // Number of tickets to mint
    batchSize: 10,   // Tickets per batch
    retryAttempts: 3,
    delayBetweenBatches: 2000 // 2 seconds
  };

  return new BatchTicketMinter(connection, program, config);
}
