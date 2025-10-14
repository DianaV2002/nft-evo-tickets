use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{LISTING_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::{ListingAccount, TicketAccount};

#[derive(Accounts)]
pub struct CancelListingCtx<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    /// The ticket being unlisted
    #[account(
        mut,
        constraint = ticket_account.owner == seller.key() @ ErrorCode::Unauthorized,
        constraint = ticket_account.is_listed @ ErrorCode::TicketNotListed
    )]
    pub ticket_account: Account<'info, TicketAccount>,
    
    /// The listing to cancel
    #[account(
        mut,
        constraint = listing_account.seller == seller.key() @ ErrorCode::Unauthorized,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            LISTING_SEED.as_bytes(),
            ticket_account.key().as_ref()
        ],
        bump = listing_account.bump,
        close = seller
    )]
    pub listing_account: Account<'info, ListingAccount>,
    
    pub nft_mint: Account<'info, Mint>,
    
    /// Escrow NFT token account (owned by listing PDA)
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing_account,
    )]
    pub escrow_nft_account: Account<'info, TokenAccount>,
    
    /// Seller's NFT token account
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller
    )]
    pub seller_nft_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelListingCtx>) -> Result<()> {
    let ticket_key = ctx.accounts.ticket_account.key();
    let ticket = &mut ctx.accounts.ticket_account;
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_nft_account.to_account_info(),
        to: ctx.accounts.seller_nft_account.to_account_info(),
        authority: ctx.accounts.listing_account.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let seeds = &[
        PROGRAM_SEED.as_bytes(),
        LISTING_SEED.as_bytes(),
        ticket_key.as_ref(),
        &[ctx.accounts.listing_account.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    
    token::transfer(cpi_ctx, 1)?;
    
    ticket.is_listed = false;
    
    Ok(())
}
