import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { NftEvoTickets } from '../../target/types/nft_evo_tickets';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc');
const CLUSTER = 'localnet';

async function main() {
  console.log('🎫 Creating Ticket in QR Stage\n');

  // Setup connection and provider
  const rpcUrl = CLUSTER === 'localnet' ? 'http://localhost:8899' : `https://api.${CLUSTER}.solana.com`;
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load wallet
  let authorityKeypair: anchor.web3.Keypair;
  try {
    const keypairPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    authorityKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`Authority wallet: ${authorityKeypair.publicKey.toString()}`);
  } catch (err) {
    console.error('❌ Could not load wallet.');
    process.exit(1);
  }

  const wallet = new anchor.Wallet(authorityKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Load program
  const idl = JSON.parse(
    fs.readFileSync('./target/idl/nft_evo_tickets.json', 'utf-8')
  );
  const program = new Program(idl, provider) as Program<NftEvoTickets>;

  // Create event
  const BN = anchor.BN || anchor.default.BN;
  const eventId = new BN(Date.now());
  const eventName = 'QR Test Event';
  const startTs = new BN(Math.floor(Date.now() / 1000) + 3600);
  const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);

  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nft-evo-tickets'), Buffer.from('event'), eventId.toArrayLike(Buffer, 'le', 8)],
    program.programId
  );

  console.log('\n1️⃣ Creating event...');
  try {
    const tx1 = await program.methods
      .createEvent(eventId, eventName, startTs, endTs)
      .accounts({
        organizer: authorityKeypair.publicKey,
        eventAccount: eventPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Event created: ${eventPda.toString()}`);
    console.log(`   TX: https://solscan.io/tx/${tx1}?cluster=${CLUSTER}`);
  } catch (err: any) {
    if (err.message?.includes('already in use')) {
      console.log(`✅ Event already exists: ${eventPda.toString()}`);
    } else {
      throw err;
    }
  }

  // Set scanner
  const scanner = authorityKeypair; // For simplicity, using same wallet as scanner
  console.log('\n2️⃣ Setting scanner...');
  try {
    const tx2 = await program.methods
      .setScanner(scanner.publicKey)
      .accounts({
        authority: authorityKeypair.publicKey,
        eventAccount: eventPda,
      })
      .rpc();

    console.log(`✅ Scanner set: ${scanner.publicKey.toString()}`);
    console.log(`   TX: https://solscan.io/tx/${tx2}?cluster=${CLUSTER}`);
  } catch (err: any) {
    console.log(`⚠️  Scanner may already be set`);
  }

  // Mint ticket
  const owner = authorityKeypair.publicKey;

  const [ticketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nft-evo-tickets'), Buffer.from('ticket'), eventPda.toBuffer(), owner.toBuffer()],
    program.programId
  );

  const [nftMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('nft-evo-tickets'), Buffer.from('nft-mint'), eventPda.toBuffer(), owner.toBuffer()],
    program.programId
  );

  const metaplexMetadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), metaplexMetadataProgramId.toBuffer(), nftMint.toBuffer()],
    metaplexMetadataProgramId
  );

  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), metaplexMetadataProgramId.toBuffer(), nftMint.toBuffer(), Buffer.from('edition')],
    metaplexMetadataProgramId
  );

  const [tokenAccountPda] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log('\n3️⃣ Minting ticket...');
  try {
    const tx3 = await program.methods
      .mintTicket('QR-SEAT-1', null)
      .accounts({
        authority: authorityKeypair.publicKey,
        eventAccount: eventPda,
        ticketAccount: ticketPda,
        owner: owner,
        nftMint: nftMint,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenAccount: tokenAccountPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: metaplexMetadataProgramId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log(`✅ Ticket minted: ${ticketPda.toString()}`);
    console.log(`   NFT Mint: ${nftMint.toString()}`);
    console.log(`   TX: https://solscan.io/tx/${tx3}?cluster=${CLUSTER}`);
  } catch (err: any) {
    if (err.message?.includes('already in use')) {
      console.log(`✅ Ticket already exists: ${ticketPda.toString()}`);
      console.log(`   NFT Mint: ${nftMint.toString()}`);
    } else {
      throw err;
    }
  }

  // Update ticket to QR stage
  console.log('\n4️⃣ Updating ticket to QR stage...');
  const tx4 = await program.methods
    .updateTicket({ qr: {} })
    .accounts({
      signer: authorityKeypair.publicKey,
      eventAccount: eventPda,
      ticketAccount: ticketPda,
      authority: authorityKeypair.publicKey,
      scanner: scanner.publicKey,
    })
    .rpc();

  console.log(`✅ Ticket updated to QR stage`);
  console.log(`   TX: https://solscan.io/tx/${tx4}?cluster=${CLUSTER}`);

  // Verify
  const ticketAccount = await program.account.ticketAccount.fetch(ticketPda);
  console.log('\n📋 Ticket Details:');
  console.log(`   Ticket PDA: ${ticketPda.toString()}`);
  console.log(`   NFT Mint: ${nftMint.toString()}`);
  console.log(`   Owner: ${ticketAccount.owner.toString()}`);
  console.log(`   Event: ${ticketAccount.event.toString()}`);
  console.log(`   Seat: ${ticketAccount.seat}`);
  console.log(`   Stage: ${JSON.stringify(ticketAccount.stage)}`);
  console.log(`   Was Scanned: ${ticketAccount.wasScanned}`);

  console.log('\n✅ QR Code content (NFT Mint):');
  console.log(`   ${nftMint.toString()}`);

  console.log('\n🔍 To validate this ticket, run:');
  console.log(`   npm run validate-ticket scan ${nftMint.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
