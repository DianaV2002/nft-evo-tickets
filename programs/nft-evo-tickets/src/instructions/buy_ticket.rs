use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use anchor_lang::system_program;

use crate::constants::{LISTING_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::{EventAccount, ListingAccount, TicketAccount};

#[derive(Accounts)]
pub struct BuyTicketCtx<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// The ticket being purchased
    #[account(
        mut,
        constraint = ticket_account.is_listed @ ErrorCode::TicketNotListed
    )]
    pub ticket_account: Account<'info, TicketAccount>,
    
    /// The listing for this ticket
    #[account(
        mut,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            LISTING_SEED.as_bytes(),
            ticket_account.key().as_ref()
        ],
        bump = listing_account.bump,
        close = buyer
    )]
    pub listing_account: Account<'info, ListingAccount>,
    
    /// Event account for validation
    pub event_account: Account<'info, EventAccount>,
    
    #[account(mut)]
    pub seller: SystemAccount<'info>,
    
    pub nft_mint: Account<'info, Mint>,
    
    /// Escrow NFT token account
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing_account
    )]
    pub escrow_nft_account: Account<'info, TokenAccount>,
    
    /// Buyer's NFT token account
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_nft_account: Account<'info, TokenAccount>,
    
    // pub event_authority: Option<SystemAccount<'info>>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<BuyTicketCtx>) -> Result<()> {
    let ticket_key = ctx.accounts.ticket_account.key(); // Extract key before mutable borrow
    let ticket = &mut ctx.accounts.ticket_account;
    let listing = &ctx.accounts.listing_account;
    
    // Validate payment amount
    require!(
        ctx.accounts.buyer.lamports() >= listing.price_lamports,
        ErrorCode::InsufficientPayment
    );
    
    // Check if listing expired
    if let Some(expires_at) = listing.expires_at {
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time <= expires_at, ErrorCode::ListingExpired);
    }
    
    // Calculate fees (5% to event authority if provided)
    let fee_basis_points = 500; // 5%
    let fee_amount = (listing.price_lamports * fee_basis_points) / 10000;
    let seller_amount = listing.price_lamports - fee_amount;
    
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        ),
        seller_amount,
    )?;

   // Pay fee (if any)
   /*
    if let Some(event_authority) = &ctx.accounts.event_authority {
        if fee_amount > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: event_authority.to_account_info(),
                    },
                ),
                fee_amount,
            )?;
        }
    }
    */
    
    // Transfer NFT from escrow to buyer
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_nft_account.to_account_info(),
        to: ctx.accounts.buyer_nft_account.to_account_info(),
        authority: ctx.accounts.listing_account.to_account_info(), // Listing PDA is authority
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let seeds = &[
        PROGRAM_SEED.as_bytes(),
        LISTING_SEED.as_bytes(),
        ticket_key.as_ref(), // Use extracted key
        &[ctx.accounts.listing_account.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    
    token::transfer(cpi_ctx, 1)?;
    
    // Update ticket ownership
    ticket.owner = ctx.accounts.buyer.key();
    ticket.is_listed = false;
    
    Ok(())
}
