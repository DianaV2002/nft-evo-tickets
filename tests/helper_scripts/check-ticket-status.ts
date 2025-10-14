import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NftEvoTickets } from '../../target/types/nft_evo_tickets';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('2epW2RyDJZwUe3AahRSuKB2usqPzqm1qckPP7KPkLg3c');
const CLUSTER = 'devnet'; // Change to 'mainnet-beta' for production
const PROGRAM_SEED = 'nft-evo-tickets';
const LISTING_SEED = 'listing';

// Helper to generate Solscan link
function solscan(address: string, type: 'account' | 'tx' = 'account'): string {
  const cluster = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`;
  return `https://solscan.io/${type}/${address}${cluster}`;
}

/**
 * Check the status of a single NFT ticket
 */
async function checkTicketStatus(
  program: Program<NftEvoTickets>,
  ticketPubkey: PublicKey
): Promise<void> {
  try {
    console.log(`\n=== Checking Ticket: ${ticketPubkey.toString()} ===`);
    console.log(`🔗 ${solscan(ticketPubkey.toString())}`);

    // Fetch ticket account
    const ticket = await program.account.ticketAccount.fetch(ticketPubkey);

    console.log('\n📋 Ticket Details:');
    console.log(`  Owner: ${ticket.owner.toString()}`);
    console.log(`    🔗 ${solscan(ticket.owner.toString())}`);
    console.log(`  Event: ${ticket.event.toString()}`);
    console.log(`    🔗 ${solscan(ticket.event.toString())}`);
    console.log(`  NFT Mint: ${ticket.nftMint.toString()}`);
    console.log(`    🔗 ${solscan(ticket.nftMint.toString())}`);
    console.log(`  Seat: ${ticket.seat || 'N/A'}`);
    console.log(`  Stage: ${getStageLabel(ticket.stage)}`);
    console.log(`  Listed: ${ticket.isListed ? '✅ Yes' : '❌ No'}`);

    // If listed, fetch listing details
    if (ticket.isListed) {
      const [listingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROGRAM_SEED),
          Buffer.from(LISTING_SEED),
          ticketPubkey.toBuffer()
        ],
        program.programId
      );

      try {
        const listing = await program.account.listingAccount.fetch(listingPda);

        console.log('\n💰 Listing Details:');
        console.log(`  Seller: ${listing.seller.toString()}`);
        console.log(`    🔗 ${solscan(listing.seller.toString())}`);
        console.log(`  Price: ${listing.priceLamports.toString()} lamports (${listing.priceLamports.toNumber() / 1e9} SOL)`);
        console.log(`  Created: ${new Date(listing.createdAt.toNumber() * 1000).toISOString()}`);
        console.log(`  Expires: ${listing.expiresAt ? new Date(listing.expiresAt.toNumber() * 1000).toISOString() : 'Never'}`);
        console.log(`  Listing PDA: ${listingPda.toString()}`);
        console.log(`    🔗 ${solscan(listingPda.toString())}`);
      } catch (err) {
        console.log('\n⚠️  Ticket marked as listed but listing account not found');
      }
    }

    // Fetch event details
    try {
      const event = await program.account.eventAccount.fetch(ticket.event);
      console.log('\n Event Information:');
      console.log(`  Name: ${event.name}`);
      console.log(`  Event ID: ${event.eventId.toString()}`);
      console.log(`  Start: ${new Date(event.startTs.toNumber() * 1000).toISOString()}`);
      console.log(`  End: ${new Date(event.endTs.toNumber() * 1000).toISOString()}`);
      console.log(`  Authority: ${event.authority.toString()}`);
      console.log(`    🔗 ${solscan(event.authority.toString())}`);
    } catch (err) {
      console.log('\n⚠️  Could not fetch event details');
    }

  } catch (error) {
    console.error(`\n❌ Error fetching ticket: ${error}`);
    throw error;
  }
}

/**
 * Get all tickets for a specific owner
 */
async function getTicketsByOwner(
  program: Program<NftEvoTickets>,
  ownerPubkey: PublicKey
): Promise<void> {
  console.log(`\n=== Fetching tickets for owner: ${ownerPubkey.toString()} ===`);

  const tickets = await program.account.ticketAccount.all([
    {
      memcmp: {
        offset: 8 + 32, // After discriminator + event pubkey
        bytes: ownerPubkey.toBase58()
      }
    }
  ]);

  console.log(`\nFound ${tickets.length} ticket(s)`);

  for (const ticket of tickets) {
    console.log(`\n---`);
    console.log(`Ticket: ${ticket.publicKey.toString()}`);
    console.log(`  🔗 ${solscan(ticket.publicKey.toString())}`);
    console.log(`  Seat: ${ticket.account.seat || 'N/A'}`);
    console.log(`  Stage: ${getStageLabel(ticket.account.stage)}`);
    console.log(`  Listed: ${ticket.account.isListed ? '✅' : '❌'}`);
  }
}

/**
 * Get all tickets for a specific event
 */
async function getTicketsByEvent(
  program: Program<NftEvoTickets>,
  eventPubkey: PublicKey
): Promise<void> {
  console.log(`\n=== Fetching tickets for event: ${eventPubkey.toString()} ===`);

  const tickets = await program.account.ticketAccount.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: eventPubkey.toBase58()
      }
    }
  ]);

  console.log(`\nFound ${tickets.length} ticket(s)`);

  for (const ticket of tickets) {
    console.log(`\n---`);
    console.log(`Ticket: ${ticket.publicKey.toString()}`);
    console.log(`  🔗 ${solscan(ticket.publicKey.toString())}`);
    console.log(`  Owner: ${ticket.account.owner.toString()}`);
    console.log(`  Seat: ${ticket.account.seat || 'N/A'}`);
    console.log(`  Stage: ${getStageLabel(ticket.account.stage)}`);
    console.log(`  Listed: ${ticket.account.isListed ? '✅' : '❌'}`);
  }
}

/**
 * Get all active listings
 */
async function getAllListings(program: Program<NftEvoTickets>): Promise<void> {
  console.log(`\n=== Fetching all active listings ===`);

  const listings = await program.account.listingAccount.all();

  console.log(`\nFound ${listings.length} listing(s)`);

  const now = Date.now() / 1000;

  for (const listing of listings) {
    const isExpired = listing.account.expiresAt && listing.account.expiresAt.toNumber() < now;

    console.log(`\n---`);
    console.log(`Listing PDA: ${listing.publicKey.toString()}`);
    console.log(`  🔗 ${solscan(listing.publicKey.toString())}`);
    console.log(`  Ticket: ${listing.account.ticket.toString()}`);
    console.log(`    🔗 ${solscan(listing.account.ticket.toString())}`);
    console.log(`  Seller: ${listing.account.seller.toString()}`);
    console.log(`    🔗 ${solscan(listing.account.seller.toString())}`);
    console.log(`  Price: ${listing.account.priceLamports.toNumber() / 1e9} SOL`);
    console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
  }
}

// Helper function to get stage label
function getStageLabel(stage: any): string {
  // TicketStage enum: { Qr: 0 }
  if (stage.qr !== undefined || stage === 0) {
    return 'QR';
  }
  return 'Unknown';
}

// Main execution
async function main() {
  console.log(' NFT Ticket Status Checker\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  // Setup connection and provider
  const connection = new Connection(clusterApiUrl(CLUSTER as any), 'confirmed');

  // Load wallet (you can also use Keypair.generate() for read-only operations)
  let wallet: anchor.Wallet;
  try {
    const keypairPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
    wallet = new anchor.Wallet(keypair);
  } catch (err) {
    console.log('⚠️  Could not load wallet, using dummy wallet for read-only operations');
    wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  }

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Load program
  const idl = JSON.parse(
    fs.readFileSync('./target/idl/nft_evo_tickets.json', 'utf-8')
  );
  const program = new Program(idl, provider) as Program<NftEvoTickets>;

  // Execute command
  if (!command) {
    console.log('Usage:');
    console.log('  ts-node scripts/check-ticket-status.ts ticket <TICKET_PUBKEY>');
    console.log('  ts-node scripts/check-ticket-status.ts owner <OWNER_PUBKEY>');
    console.log('  ts-node scripts/check-ticket-status.ts event <EVENT_PUBKEY>');
    console.log('  ts-node scripts/check-ticket-status.ts listings');
    return;
  }

  switch (command) {
    case 'ticket':
      if (!args[1]) {
        console.error('❌ Please provide a ticket public key');
        return;
      }
      await checkTicketStatus(program, new PublicKey(args[1]));
      break;

    case 'owner':
      if (!args[1]) {
        console.error('❌ Please provide an owner public key');
        return;
      }
      await getTicketsByOwner(program, new PublicKey(args[1]));
      break;

    case 'event':
      if (!args[1]) {
        console.error('❌ Please provide an event public key');
        return;
      }
      await getTicketsByEvent(program, new PublicKey(args[1]));
      break;

    case 'listings':
      await getAllListings(program);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nAvailable commands: ticket, owner, event, listings');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
