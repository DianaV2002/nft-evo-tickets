# Implementing Direct Ticket Purchase

## Problem
Currently, users cannot buy tickets directly from events. The `mint_ticket` instruction requires the event authority (organizer) to sign, which prevents regular users from purchasing tickets.

## Solution
Add a new `purchase_ticket` instruction to the Solana program that:
1. Accepts payment from the buyer
2. Transfers funds to the event organizer
3. Automatically mints the ticket NFT to the buyer's wallet

## Program Implementation

### New Instruction: `purchase_ticket`

Add this to your Solana program (`programs/nft-evo-tickets/src/lib.rs`):

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instructions as mpl_instructions;

#[derive(Accounts)]
pub struct PurchaseTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = event_account.start_ts > Clock::get()?.unix_timestamp @ ErrorCode::EventAlreadyStarted,
    )]
    pub event_account: Account<'info, EventAccount>,

    /// The event organizer who will receive payment
    #[account(
        mut,
        address = event_account.authority @ ErrorCode::Unauthorized
    )]
    pub organizer: SystemAccount<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + TicketAccount::INIT_SPACE,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            TICKET_SEED.as_bytes(),
            event_account.key().as_ref(),
            buyer.key().as_ref(),
        ],
        bump
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = ticket_account,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            b"nft-mint",
            event_account.key().as_ref(),
            buyer.key().as_ref(),
        ],
        bump
    )]
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: Metaplex token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn purchase_ticket(
    ctx: Context<PurchaseTicket>,
    ticket_price_lamports: u64,
    seat: Option<String>,
) -> Result<()> {
    let event_account = &ctx.accounts.event_account;
    let ticket_account = &mut ctx.accounts.ticket_account;
    let buyer = &ctx.accounts.buyer;
    let organizer = &ctx.accounts.organizer;

    // Transfer payment from buyer to organizer
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        buyer.key,
        organizer.key,
        ticket_price_lamports,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            buyer.to_account_info(),
            organizer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Initialize ticket account
    ticket_account.event = event_account.key();
    ticket_account.owner = buyer.key();
    ticket_account.nft_mint = ctx.accounts.nft_mint.key();
    ticket_account.seat = seat;
    ticket_account.stage = TicketStage::Prestige;
    ticket_account.is_listed = false;
    ticket_account.was_scanned = false;
    ticket_account.listing_price = None;
    ticket_account.listing_expires_at = None;
    ticket_account.bump = ctx.bumps.ticket_account;

    // Mint NFT to buyer
    let seeds = &[
        PROGRAM_SEED.as_bytes(),
        TICKET_SEED.as_bytes(),
        event_account.key().as_ref(),
        buyer.key().as_ref(),
        &[ctx.bumps.ticket_account],
    ];
    let signer = &[&seeds[..]];

    // Mint 1 token
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ticket_account.to_account_info(),
            },
            signer,
        ),
        1,
    )?;

    // Create metadata
    let metadata_uri = format!(
        "https://nft-evo-tickets.vercel.app/metadata/{}/{}",
        event_account.event_id,
        buyer.key()
    );

    mpl_instructions::CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.nft_mint.key(),
        mint_authority: ticket_account.key(),
        payer: buyer.key(),
        update_authority: (ticket_account.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }
    .instruction(mpl_instructions::CreateMetadataAccountV3InstructionArgs {
        data: mpl_token_metadata::types::DataV2 {
            name: format!("Ticket - {}", event_account.name),
            symbol: "TIX".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        is_mutable: true,
        collection_details: None,
    })
    .invoke()?;

    // Create master edition
    mpl_instructions::CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.key(),
        mint: ctx.accounts.nft_mint.key(),
        update_authority: ticket_account.key(),
        mint_authority: ticket_account.key(),
        payer: buyer.key(),
        metadata: ctx.accounts.metadata.key(),
        token_program: ctx.accounts.token_program.key(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }
    .instruction(mpl_instructions::CreateMasterEditionV3InstructionArgs {
        max_supply: Some(1),
    })
    .invoke()?;

    msg!("Ticket purchased and NFT minted to buyer: {}", buyer.key());

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    // ... existing errors ...
    #[msg("Event has already started. Cannot purchase tickets.")]
    EventAlreadyStarted,
}
```

## Frontend Implementation

Add this function to `frontend/src/services/ticketService.ts`:

```typescript
/**
 * Purchase a ticket directly from an event (primary market)
 * This mints a new ticket and transfers payment to the organizer
 */
export async function purchaseTicket(
  connection: Connection,
  wallet: any,
  eventPublicKey: PublicKey,
  ticketPriceLamports: number,
  seat?: string
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const { Program, AnchorProvider, web3 } = await import("@coral-xyz/anchor");

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as any, provider);

  try {
    const buyer = wallet.publicKey;

    // Get event data to find the organizer
    const eventAccount = await program.account.eventAccount.fetch(eventPublicKey);
    const organizer = eventAccount.authority as PublicKey;

    // Derive ticket PDA
    const [ticketPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from(TICKET_SEED),
        eventPublicKey.toBuffer(),
        buyer.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive NFT mint PDA
    const [nftMintPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(PROGRAM_SEED),
        Buffer.from("nft-mint"),
        eventPublicKey.toBuffer(),
        buyer.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Derive metadata PDA
    const [metadataPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive master edition PDA
    const [masterEditionPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintPda.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    // Derive buyer's token account
    const buyerTokenAccount = await getAssociatedTokenAddress(
      nftMintPda,
      buyer
    );

    console.log("Purchasing ticket:", {
      buyer: buyer.toString(),
      organizer: organizer.toString(),
      eventAccount: eventPublicKey.toString(),
      ticketAccount: ticketPda.toString(),
      nftMint: nftMintPda.toString(),
      price: `${ticketPriceLamports / LAMPORTS_PER_SOL} SOL`,
    });

    // Call purchase_ticket instruction
    const tx = await program.methods
      .purchaseTicket(new anchor.BN(ticketPriceLamports), seat || null)
      .accounts({
        buyer: buyer,
        eventAccount: eventPublicKey,
        organizer: organizer,
        ticketAccount: ticketPda,
        nftMint: nftMintPda,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Ticket purchased! Transaction:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error purchasing ticket:", error);
    throw error;
  }
}
```

## Usage in Events Page

Update `frontend/src/pages/Events.tsx`:

```typescript
const handleBuyTicket = async () => {
  if (!wallet.connected || !wallet.publicKey) {
    toast.error("Please connect your wallet first")
    return
  }

  if (!selectedEvent) {
    toast.error("No event selected")
    return
  }

  try {
    setBuyingTicket(true)
    toast.loading("Purchasing your ticket...")

    // Use the new purchase function
    const ticketPrice = 0.1 * LAMPORTS_PER_SOL; // Example: 0.1 SOL
    const tx = await purchaseTicket(
      connection,
      wallet,
      new PublicKey(selectedEvent.publicKey),
      ticketPrice,
      undefined // seat (optional)
    )

    toast.dismiss()
    toast.success("Ticket purchased successfully!")
    toast.success(`Transaction: ${tx.slice(0, 8)}...${tx.slice(-8)}`)

    setIsDialogOpen(false)
  } catch (error: any) {
    console.error("Error buying ticket:", error)
    toast.dismiss()

    if (error.message?.includes("already in use")) {
      toast.error("You already have a ticket for this event!")
    } else {
      toast.error(error.message || "Failed to purchase ticket")
    }
  } finally {
    setBuyingTicket(false)
  }
}
```

## Benefits

✅ **Direct Purchase**: Users can buy tickets with one transaction
✅ **Automatic Minting**: NFT is minted immediately upon payment
✅ **Payment to Organizer**: Funds go directly to event organizer
✅ **Better UX**: No need for marketplace intermediary
✅ **Gas Efficient**: Single transaction instead of mint + list + buy

## Implementation Steps

1. **Update Solana Program**:
   ```bash
   cd programs/nft-evo-tickets
   # Add the purchase_ticket function to lib.rs
   anchor build
   anchor deploy
   ```

2. **Update IDL**:
   ```bash
   cp target/idl/nft_evo_tickets.json frontend/src/anchor-idl/
   ```

3. **Add Frontend Function**:
   - Add `purchaseTicket()` to `ticketService.ts`
   - Update Events page to use the new function

4. **Test**:
   ```bash
   anchor test
   ```

## Storage Requirements

Need to add ticket price to EventAccount:

```rust
#[account]
pub struct EventAccount {
    pub authority: Pubkey,
    pub scanner: Pubkey,
    pub event_id: u64,
    pub name: String,
    pub start_ts: i64,
    pub end_ts: i64,
    pub ticket_price: u64,  // ADD THIS
    pub tickets_remaining: u32,  // ADD THIS (optional)
    pub bump: u8,
}
```

Update `create_event` or `initialize_event` to set the ticket price.
