use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::constants::{LISTING_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::{EventAccount, ListingAccount, TicketAccount, TicketStage};

#[derive(Accounts)]
#[instruction(price_lamports: u64, expires_at: Option<i64>)]
pub struct ListTicketCtx<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    /// The ticket being listed
    #[account(
        mut,
        constraint = ticket_account.owner == seller.key() @ ErrorCode::Unauthorized,
        constraint = !ticket_account.is_listed @ ErrorCode::TicketAlreadyListed,
        constraint = ticket_account.stage == TicketStage::Qr || ticket_account.stage == TicketStage::Collectible @ ErrorCode::CannotListInCurrentStage
    )]
    pub ticket_account: Account<'info, TicketAccount>,
    
    /// Event account for validation
    pub event_account: Account<'info, EventAccount>,
    
    /// PDA for the listing
    #[account(
        init,
        payer = seller,
        space = 8 + ListingAccount::INIT_SPACE,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            LISTING_SEED.as_bytes(),
            ticket_account.key().as_ref()
        ],
        bump
    )]
    pub listing_account: Account<'info, ListingAccount>,
    
    pub nft_mint: Account<'info, Mint>,
    
    /// Seller's NFT token account
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller
    )]
    pub seller_nft_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = listing_account,
        // escrow account's authority is the listing PDA
        // This ensures the listing PDA can control the NFT transfer during a sale
    )]
    pub escrow_nft_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<ListTicketCtx>,
    price_lamports: u64,
    expires_at: Option<i64>,
) -> Result<()> {
    let ticket_key = ctx.accounts.ticket_account.key();
    let seller_key = ctx.accounts.seller.key();
    let current_time = Clock::get()?.unix_timestamp;
    
    if let Some(expires) = expires_at {
        require!(expires > current_time, ErrorCode::InvalidInput);
    }
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.seller_nft_account.to_account_info(),
        to: ctx.accounts.escrow_nft_account.to_account_info(),
        authority: ctx.accounts.seller.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, 1)?;
    
    let ticket = &mut ctx.accounts.ticket_account;
    let listing = &mut ctx.accounts.listing_account;
    
    listing.ticket = ticket_key;
    listing.seller = seller_key;
    listing.price_lamports = price_lamports;
    listing.created_at = current_time;
    listing.expires_at = expires_at;
    listing.bump = ctx.bumps.listing_account;
    
    ticket.is_listed = true;
    
    Ok(())
}
