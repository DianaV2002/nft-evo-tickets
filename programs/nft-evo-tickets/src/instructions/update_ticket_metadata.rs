use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::instruction::{update_metadata_accounts_v2};
use solana_program::program::invoke_signed;

use crate::state::{EventAccount, TicketAccount, TicketStage};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct UpdateTicketMetadata<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"event".as_ref(), authority.key().as_ref(), &event_account.event_id.to_le_bytes()],
        bump = event_account.bump,
        has_one = authority,
        has_one = scanner
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        constraint = ticket_account.event == event_account.key()
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    pub ticket_mint: Account<'info, Mint>,

    /// CHECK: This is the metadata account of the ticket mint. It is validated by the Metaplex program.
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: The authority of the event account.
    pub authority: UncheckedAccount<'info>,
    
    /// CHECK: The scanner of the event account.
    pub scanner: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<UpdateTicketMetadata>, new_stage: TicketStage, new_uri: String) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket_account;
    let signer = &ctx.accounts.signer;
    let event_account = &ctx.accounts.event_account;
    let authority = &ctx.accounts.authority;

    // --- Authorization Logic ---
    let can_set_qr = signer.key() == authority.key();
    let can_set_scanned = signer.key() == ctx.accounts.scanner.key();

    match new_stage {
        TicketStage::Qr => {
            require!(can_set_qr, ErrorCode::Unauthorized);
            ticket.stage = TicketStage::Qr;
        },
        TicketStage::Scanned => {
            require!(can_set_scanned, ErrorCode::Unauthorized);
            require!(ticket.stage == TicketStage::Qr, ErrorCode::InvalidTicketStage);
            ticket.stage = TicketStage::Scanned;
            ticket.was_scanned = true;
        },
        _ => {
            return err!(ErrorCode::InvalidTicketStage);
        }
    }

    // --- CPI to Metaplex to update URI ---
    msg!("Updating metadata URI to: {}", new_uri);

    let seeds = &[
        "event".as_bytes(),
        authority.key().as_ref(),
        &event_account.event_id.to_le_bytes(),
        &[event_account.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let ix = update_metadata_accounts_v2(
        *ctx.accounts.token_metadata_program.key,
        *ctx.accounts.metadata_account.key,
        event_account.key(), // The event account is the update authority
        None, // new_update_authority
        Some(mpl_token_metadata::state::DataV2 {
            name: ctx.accounts.event_account.name.clone(), // Keep the name
            symbol: "EVOT".to_string(), // Keep the symbol
            uri: new_uri, // The new URI
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        }),
        Some(true), // primary_sale_happened
        Some(true), // is_mutable
    );

    invoke_signed(
        &ix,
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.metadata_account.to_account_info(),
            event_account.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Metadata URI updated successfully.");
    Ok(())
}

