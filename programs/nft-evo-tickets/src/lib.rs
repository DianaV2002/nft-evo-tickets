use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;
pub mod managers;
pub mod state;

declare_id!("G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr");

pub use instructions::*;
pub use state::*;

use managers::event_manager::EventManager;
use managers::ticket_manager::TicketManager;

// Explicitly import Anchor's generated client account types
use crate::instructions::initialize::__client_accounts_initialize_ctx;
use crate::instructions::initialize_event::__client_accounts_initialize_event_ctx;
use crate::instructions::create_event::__client_accounts_create_event_ctx;
use crate::instructions::mint_ticket::__client_accounts_mint_ticket_ctx;
use crate::instructions::list_ticket::__client_accounts_list_ticket_ctx;
use crate::instructions::buy_ticket::__client_accounts_buy_ticket_ctx;
use crate::instructions::cancel_listing::__client_accounts_cancel_listing_ctx;

#[program]
pub mod nft_evo_tickets {
    use super::*;

    pub fn initialize(ctx: Context<InitializeCtx>) -> Result<()> {
        initialize_handler(ctx)
    }

    pub fn initialize_event(
        ctx: Context<InitializeEventCtx>,
        event_id: u64,
        name: String,
        start_ts: i64,
        end_ts: i64,
    ) -> Result<()> {
        initialize_event_handler(ctx, event_id, name, start_ts, end_ts)
    }

    pub fn create_event(
        ctx: Context<CreateEventCtx>,
        event_id: u64,
        name: String,
        start_ts: i64,
        end_ts: i64,
    ) -> Result<()> {
        create_event_handler(ctx, event_id, name, start_ts, end_ts)
    }

    pub fn mint_ticket(
        ctx: Context<MintTicketCtx>,
        seat: Option<String>,
        metadata_uri_override: Option<String>,
    ) -> Result<()> {
        mint_ticket_handler(ctx, seat, metadata_uri_override)
    }

    pub fn list_ticket(
        ctx: Context<ListTicketCtx>,
        price_lamports: u64,
        expires_at: Option<i64>,
    ) -> Result<()> {
        list_ticket_handler(ctx, price_lamports, expires_at)
    }

    pub fn buy_ticket(ctx: Context<BuyTicketCtx>) -> Result<()> {
        buy_ticket_handler(ctx)
    }

    pub fn cancel_listing(ctx: Context<CancelListingCtx>) -> Result<()> {
        cancel_listing_handler(ctx)
    }
}

    pub fn create_event(
        ctx: Context<CreateEvent>,
        name: String,
        description: String,
        date: i64,
        location: String,
        ticket_price: u64,
    ) -> Result<()> {
        EventManager::run_create_event(ctx, name, description, date, location, ticket_price)
    }

    pub fn buy_ticket(ctx: Context<BuyTicket>, date_of_purchase: i64) -> Result<()> {
        TicketManager::run_buy_ticket(ctx, date_of_purchase)
    }
}

#[account]
#[derive(InitSpace)]
pub struct Event {
    #[max_len(50)]
    pub name: String,
    #[max_len(2000)]
    pub description: String,
    pub date: i64,
    #[max_len(50)]
    pub location: String,
    pub ticket_price: u64,
    pub organizer: Pubkey
}

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init, 
        payer = organizer, 
        space = 8 + Event::INIT_SPACE, 
        seeds=[b"event", organizer.key().as_ref()],
        bump)]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]

pub struct Ticket {
    pub event: Pubkey,
    pub price: u64,
    pub date_of_purchase: i64,
    pub owner: Pubkey,
    // TODO: need to check why I get "consumed 5805 of 200000 compute units" and "failed: Failed to reallocate account data"
    // #[max_len(10240)] // ~10 KB
    // pub qr_code: Vec<u8>, // QR bytes
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(init, payer = owner, space = 8 + Ticket::INIT_SPACE)]
    pub ticket: Account<'info, Ticket>,
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: The organizer is not checked because it's part of the event account.
    #[account(mut)]
    pub organizer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}