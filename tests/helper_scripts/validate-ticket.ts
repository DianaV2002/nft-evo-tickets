import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NftEvoTickets } from '../../target/types/nft_evo_tickets';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc');
const CLUSTER = 'localnet'; // Change to 'devnet' or 'mainnet-beta' for production
const PROGRAM_SEED = 'nft-evo-tickets';

// Helper to generate Solscan link
function solscan(address: string, type: 'account' | 'tx' = 'account'): string {
  const cluster = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`;
  return `https://solscan.io/${type}/${address}${cluster}`;
}

/**
 * Derive ticket PDA from NFT mint address
 */
async function deriveTicketPDA(
  program: Program<NftEvoTickets>,
  nftMint: PublicKey
): Promise<{ ticketPDA: PublicKey; eventPubkey: PublicKey; ownerPubkey: PublicKey }> {
  // Use getProgramAccounts with memcmp filter for nft_mint field
  // TicketAccount layout: discriminator(8) + event(32) + owner(32) + nft_mint(32) + ...
  const NFT_MINT_OFFSET = 8 + 32 + 32; // After discriminator, event, and owner

  const accounts = await program.provider.connection.getProgramAccounts(
    program.programId,
    {
      filters: [
        {
          memcmp: {
            offset: NFT_MINT_OFFSET,
            bytes: nftMint.toBase58(),
          },
        },
      ],
    }
  );

  if (accounts.length === 0) {
    throw new Error(`No ticket found for NFT mint: ${nftMint.toString()}`);
  }

  if (accounts.length > 1) {
    throw new Error(`Multiple tickets found for NFT mint: ${nftMint.toString()}`);
  }

  const ticketPDA = accounts[0].pubkey;

  // Decode the account to get event and owner
  const ticketAccount = await program.account.ticketAccount.fetch(ticketPDA);

  // Verify nft_mint matches
  if (!ticketAccount.nftMint.equals(nftMint)) {
    throw new Error('NFT mint mismatch after filtering');
  }

  // Derive the PDA to double-verify it matches
  // Note: PDA seeds are [PROGRAM_SEED, "ticket", event, owner] - NOT including nft_mint
  const [derivedPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(PROGRAM_SEED),
      Buffer.from('ticket'),
      ticketAccount.event.toBuffer(),
      ticketAccount.owner.toBuffer(),
    ],
    program.programId
  );

  // Verify derived PDA matches the fetched account
  if (!derivedPDA.equals(ticketPDA)) {
    throw new Error('Derived ticket PDA does not match on-chain account');
  }

  return {
    ticketPDA,
    eventPubkey: ticketAccount.event,
    ownerPubkey: ticketAccount.owner,
  };
}

/**
 * Validate a ticket (scan QR) - Updates stage from QR to Scanned
 * Takes NFT mint address from QR code and derives ticket PDA
 */
async function validateTicketFromMint(
  program: Program<NftEvoTickets>,
  scannerKeypair: anchor.web3.Keypair,
  nftMint: PublicKey
): Promise<void> {
  try {
    console.log(`\n=== Validating Ticket from QR Code ===`);
    console.log(`NFT Mint (from QR): ${nftMint.toString()}`);
    console.log(`🔗 ${solscan(nftMint.toString())}`);

    // Derive ticket PDA from mint address
    console.log('\n🔍 Deriving ticket PDA from NFT mint...');
    const { ticketPDA, eventPubkey, ownerPubkey } = await deriveTicketPDA(program, nftMint);

    console.log(`✅ Ticket PDA: ${ticketPDA.toString()}`);
    console.log(`   🔗 ${solscan(ticketPDA.toString())}`);

    // Fetch ticket account to verify current stage
    const ticket = await program.account.ticketAccount.fetch(ticketPDA);

    console.log('\n📋 Current Ticket Details:');
    console.log(`  Owner: ${ticket.owner.toString()}`);
    console.log(`  Event: ${ticket.event.toString()}`);
    console.log(`  NFT Mint: ${ticket.nftMint.toString()}`);
    console.log(`  Seat: ${ticket.seat || 'N/A'}`);
    console.log(`  Current Stage: ${getStageLabel(ticket.stage)}`);
    console.log(`  Was Scanned: ${ticket.wasScanned ? '✅ Yes' : '❌ No'}`);

    // Verify NFT mint matches (security check)
    if (!ticket.nftMint.equals(nftMint)) {
      throw new Error('NFT mint mismatch! Possible ticket substitution attack.');
    }

    // Verify ticket is in QR stage
    if (!isQrStage(ticket.stage)) {
      console.error('\n❌ Ticket is not in QR stage. Cannot validate.');
      console.log('   Current stage must be QR to validate.');
      return;
    }

    // Fetch event account to get authority and scanner
    const eventAccount = await program.account.eventAccount.fetch(ticket.event);

    console.log('\n🎫 Event Information:');
    console.log(`  Name: ${eventAccount.name}`);
    console.log(`  Authority: ${eventAccount.authority.toString()}`);
    console.log(`  Scanner: ${eventAccount.scanner.toString()}`);

    // Verify scanner authorization
    if (!scannerKeypair.publicKey.equals(eventAccount.scanner)) {
      console.error('\n❌ Scanner wallet is not authorized for this event.');
      console.log(`   Required scanner: ${eventAccount.scanner.toString()}`);
      console.log(`   Your wallet: ${scannerKeypair.publicKey.toString()}`);
      return;
    }

    console.log('\n✅ Scanner authorized. Proceeding with validation...');

    // Call update_ticket instruction with Scanned stage
    const tx = await program.methods
      .updateTicket({ scanned: {} })
      .accounts({
        signer: scannerKeypair.publicKey,
        eventAccount: ticket.event,
        ticketAccount: ticketPDA,
        authority: eventAccount.authority,
        scanner: eventAccount.scanner,
      })
      .signers([scannerKeypair])
      .rpc();

    console.log('\n✅ Ticket validated successfully!');
    console.log(`   Transaction: ${tx}`);
    console.log(`   🔗 ${solscan(tx, 'tx')}`);

    // Fetch updated ticket to confirm
    const updatedTicket = await program.account.ticketAccount.fetch(ticketPDA);
    console.log('\n📋 Updated Ticket Details:');
    console.log(`  New Stage: ${getStageLabel(updatedTicket.stage)}`);
    console.log(`  Was Scanned: ${updatedTicket.wasScanned ? '✅ Yes' : '❌ No'}`);

  } catch (error: any) {
    console.error(`\n❌ Error validating ticket: ${error.message || error}`);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    throw error;
  }
}

/**
 * Check if ticket can be validated (is in QR stage)
 */
async function checkTicketValidation(
  program: Program<NftEvoTickets>,
  ticketPubkey: PublicKey
): Promise<void> {
  try {
    console.log(`\n=== Checking Ticket Validation Status ===`);
    console.log(`Ticket: ${ticketPubkey.toString()}`);
    console.log(`🔗 ${solscan(ticketPubkey.toString())}`);

    const ticket = await program.account.ticketAccount.fetch(ticketPubkey);
    const eventAccount = await program.account.eventAccount.fetch(ticket.event);

    console.log('\n📋 Ticket Status:');
    console.log(`  Current Stage: ${getStageLabel(ticket.stage)}`);
    console.log(`  Was Scanned: ${ticket.wasScanned ? '✅ Yes' : '❌ No'}`);
    console.log(`  Can be validated: ${isQrStage(ticket.stage) ? '✅ Yes' : '❌ No'}`);

    console.log('\n🔐 Required Scanner:');
    console.log(`  ${eventAccount.scanner.toString()}`);
    console.log(`  🔗 ${solscan(eventAccount.scanner.toString())}`);

    if (isQrStage(ticket.stage)) {
      console.log('\n✅ This ticket is ready to be validated (scanned).');
    } else {
      console.log('\n⚠️  This ticket cannot be validated.');
      if (ticket.wasScanned) {
        console.log('   Reason: Ticket has already been scanned.');
      } else {
        console.log('   Reason: Ticket is not in QR stage.');
      }
    }

  } catch (error) {
    console.error(`\n❌ Error checking ticket: ${error}`);
    throw error;
  }
}

// Helper function to check if stage is QR
function isQrStage(stage: any): boolean {
  return stage.qr !== undefined;
}

// Helper function to get stage label
function getStageLabel(stage: any): string {
  if (stage.prestige !== undefined) return 'Prestige';
  if (stage.qr !== undefined) return 'QR';
  if (stage.scanned !== undefined) return 'Scanned';
  if (stage.collectible !== undefined) return 'Collectible';
  return 'Unknown';
}

// Main execution
async function main() {
  console.log('🎫 NFT Ticket Validation Script\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  // Setup connection and provider
  const rpcUrl = CLUSTER === 'localnet' ? 'http://localhost:8899' : clusterApiUrl(CLUSTER as any);
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load scanner wallet
  let scannerKeypair: anchor.web3.Keypair;
  try {
    const keypairPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    scannerKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`Scanner wallet: ${scannerKeypair.publicKey.toString()}`);
  } catch (err) {
    console.error('❌ Could not load wallet. Please set ANCHOR_WALLET environment variable.');
    process.exit(1);
  }

  const wallet = new anchor.Wallet(scannerKeypair);
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
    console.log('  ts-node scripts/validate-ticket.ts scan <NFT_MINT_ADDRESS>');
    console.log('  ts-node scripts/validate-ticket.ts check <TICKET_PUBKEY>');
    console.log('\nExamples:');
    console.log('  # Scan QR code (validate ticket using NFT mint from QR)');
    console.log('  ts-node scripts/validate-ticket.ts scan 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    console.log('\n  # Check if ticket can be validated');
    console.log('  ts-node scripts/validate-ticket.ts check 8qK...');
    return;
  }

  switch (command) {
    case 'scan':
    case 'validate':
      if (!args[1]) {
        console.error('❌ Please provide an NFT mint address (from QR code)');
        return;
      }
      await validateTicketFromMint(program, scannerKeypair, new PublicKey(args[1]));
      break;

    case 'check':
      if (!args[1]) {
        console.error('❌ Please provide a ticket public key');
        return;
      }
      await checkTicketValidation(program, new PublicKey(args[1]));
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nAvailable commands: scan, validate, check');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
