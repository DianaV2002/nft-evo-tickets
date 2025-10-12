use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, MintTo},
};
use mpl_token_metadata::{
    instructions::{
        CreateMasterEditionV3, CreateMasterEditionV3InstructionArgs, CreateMetadataAccountV3,
        CreateMetadataAccountV3InstructionArgs,
    },
    types::{Creator, DataV2},
};

use crate::{
    constants::{PROGRAM_SEED, TICKET_SEED},
    error::ErrorCode,
    state::{EventAccount, TicketAccount, TicketStage},
};

#[derive(Accounts)]
#[instruction(ticket_price_lamports: u64, seat: Option<String>, ticket_id: u64)]
pub struct BuyEventTicketCtx<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub event_account: Account<'info, EventAccount>,

    /// The event organizer who will receive payment
    /// CHECK: This is validated as the event authority
    #[account(
        mut,
        constraint = organizer.key() == event_account.authority @ ErrorCode::Unauthorized
    )]
    pub organizer: UncheckedAccount<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + TicketAccount::INIT_SPACE,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            TICKET_SEED.as_bytes(),
            event_account.key().as_ref(),
            buyer.key().as_ref(),
            &ticket_id.to_le_bytes(),
        ],
        bump
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    #[account(
        init,
        payer = buyer,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            b"nft-mint",
            event_account.key().as_ref(),
            buyer.key().as_ref(),
            &ticket_id.to_le_bytes(),
        ],
        bump,
        mint::decimals = 0,
        mint::authority = ticket_account.key(),
        mint::freeze_authority = ticket_account.key(),
        mint::token_program = token_program,
    )]
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: Metaplex Metadata PDA
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition PDA
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<BuyEventTicketCtx>,
    ticket_price_lamports: u64,
    seat: Option<String>,
    ticket_id: u64,
) -> Result<()> {
    let event_account = &mut ctx.accounts.event_account;
    let ticket_account = &mut ctx.accounts.ticket_account;
    let buyer = &ctx.accounts.buyer;
    let organizer = &ctx.accounts.organizer;

    // Check if tickets are still available
    require!(
        event_account.tickets_sold < event_account.ticket_supply,
        ErrorCode::InvalidInput
    );

    // Increment tickets sold
    event_account.tickets_sold = event_account
        .tickets_sold
        .checked_add(1)
        .ok_or(ErrorCode::InvalidInput)?;

    msg!("Ticket {} of {} sold", event_account.tickets_sold, event_account.ticket_supply);

    // Transfer payment from buyer to organizer
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        buyer.key,
        organizer.key,
        ticket_price_lamports,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            buyer.to_account_info(),
            organizer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("Payment transferred: {} lamports to organizer", ticket_price_lamports);

    // Initialize ticket account
    ticket_account.event = event_account.key();
    ticket_account.owner = buyer.key();
    ticket_account.nft_mint = ctx.accounts.nft_mint.key();
    ticket_account.seat = seat.clone();
    ticket_account.stage = TicketStage::Prestige;
    ticket_account.is_listed = false;
    ticket_account.was_scanned = false;
    ticket_account.listing_price = None;
    ticket_account.listing_expires_at = None;
    ticket_account.bump = ctx.bumps.ticket_account;

    // Mint 1 NFT token to buyer
    let event_key = event_account.key();
    let buyer_key = buyer.key();
    let ticket_id_bytes = ticket_id.to_le_bytes();
    let seeds = &[
        PROGRAM_SEED.as_bytes(),
        TICKET_SEED.as_bytes(),
        event_key.as_ref(),
        buyer_key.as_ref(),
        &ticket_id_bytes,
        &[ctx.bumps.ticket_account],
    ];
    let signer = &[&seeds[..]];

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

    msg!("NFT minted to buyer token account");

    // Create metadata
    let metadata_uri = format!(
        "https://nft-evo-tickets.vercel.app/api/metadata/{}/{}",
        event_account.event_id,
        buyer.key()
    );

    let ticket_name = if let Some(seat_id) = &seat {
        format!("{} - Seat {}", event_account.name, seat_id)
    } else {
        format!("{} - Ticket", event_account.name)
    };

    let create_metadata_accounts = CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.nft_mint.key(),
        mint_authority: ticket_account.key(),
        payer: buyer.key(),
        update_authority: (ticket_account.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let create_metadata_args = CreateMetadataAccountV3InstructionArgs {
        data: DataV2 {
            name: ticket_name,
            symbol: "TIX".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: event_account.authority,
                verified: false,
                share: 100,
            }]),
            collection: None,
            uses: None,
        },
        is_mutable: true,
        collection_details: None,
    };

    let create_metadata_ix = create_metadata_accounts.instruction(create_metadata_args);

    invoke_signed(
        &create_metadata_ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ticket_account.to_account_info(),
            buyer.to_account_info(),
            ticket_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer,
    )?;

    msg!("Metadata created");

    // Create master edition (makes it an NFT with max_supply = 1)
    let create_master_edition_accounts = CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.key(),
        mint: ctx.accounts.nft_mint.key(),
        update_authority: ticket_account.key(),
        mint_authority: ticket_account.key(),
        payer: buyer.key(),
        metadata: ctx.accounts.metadata.key(),
        token_program: ctx.accounts.token_program.key(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let create_master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(1),
    };

    let create_master_edition_ix =
        create_master_edition_accounts.instruction(create_master_edition_args);

    invoke_signed(
        &create_master_edition_ix,
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ticket_account.to_account_info(),
            ticket_account.to_account_info(),
            buyer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer,
    )?;

    msg!(
        "✅ Ticket purchased! NFT minted to buyer: {}",
        buyer.key()
    );

    Ok(())
}
