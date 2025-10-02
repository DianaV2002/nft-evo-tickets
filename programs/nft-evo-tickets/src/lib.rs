use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;

declare_id!("G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr");

pub use instructions::*;
pub use state::*;

use crate::instructions::initialize::__client_accounts_initialize_ctx;
use crate::instructions::initialize_event::__client_accounts_initialize_event_ctx;
use crate::instructions::create_event::__client_accounts_create_event_ctx;
use crate::instructions::mint_ticket::__client_accounts_mint_ticket_ctx;
use crate::instructions::list_ticket::__client_accounts_list_ticket_ctx;
use crate::instructions::buy_ticket::__client_accounts_buy_ticket_ctx;
use crate::instructions::cancel_listing::__client_accounts_cancel_listing_ctx;
use crate::instructions::update_ticket::__client_accounts_update_ticket;
use crate::instructions::upgrade_to_collectible::__client_accounts_upgrade_to_collectible;
use crate::instructions::set_scanner::__client_accounts_set_scanner;

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

    pub fn update_ticket(ctx: Context<UpdateTicket>, new_stage: TicketStage) -> Result<()> {
        update_ticket_handler(ctx, new_stage)
    }

    pub fn upgrade_to_collectible(ctx: Context<UpgradeToCollectible>) -> Result<()> {
        upgrade_to_collectible_handler(ctx)
    }

    pub fn set_scanner(ctx: Context<SetScanner>, scanner: Pubkey) -> Result<()> {
        set_scanner_handler(ctx, scanner)
    }
}
