use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;

declare_id!("6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc");

pub use instructions::*;
pub use state::*;

use crate::instructions::initialize::__client_accounts_initialize_ctx;
use crate::instructions::initialize_event::__client_accounts_initialize_event_ctx;
use crate::instructions::create_event::__client_accounts_create_event_ctx;
use crate::instructions::mint_ticket::__client_accounts_mint_ticket_ctx;
use crate::instructions::list_ticket::__client_accounts_list_ticket_ctx;
use crate::instructions::buy_marketplace_ticket::__client_accounts_buy_marketplace_ticket_ctx;
use crate::instructions::cancel_listing::__client_accounts_cancel_listing_ctx;
use crate::instructions::update_ticket::__client_accounts_update_ticket;
use crate::instructions::update_ticket_metadata::__client_accounts_update_ticket_metadata;
use crate::instructions::upgrade_to_collectible::__client_accounts_upgrade_to_collectible;
use crate::instructions::set_scanner::__client_accounts_set_scanner;
use crate::instructions::buy_event_ticket::__client_accounts_buy_event_ticket_ctx;
use crate::instructions::delete_event::__client_accounts_delete_event_ctx;
use crate::instructions::update_event::__client_accounts_update_event_ctx;

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
        ticket_supply: u32,
        cover_image_url: String,
    ) -> Result<()> {
        create_event_handler(ctx, event_id, name, start_ts, end_ts, ticket_supply, cover_image_url)
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

    pub fn buy_marketplace_ticket(ctx: Context<BuyMarketplaceTicketCtx>) -> Result<()> {
        buy_marketplace_ticket_handler(ctx)
    }

    pub fn cancel_listing(ctx: Context<CancelListingCtx>) -> Result<()> {
        cancel_listing_handler(ctx)
    }

    pub fn update_ticket(ctx: Context<UpdateTicket>, new_stage: TicketStage) -> Result<()> {
        update_ticket_handler(ctx, new_stage)
    }

    pub fn update_ticket_metadata(
        ctx: Context<UpdateTicketMetadata>,
        new_stage: TicketStage,
        new_uri: String,
    ) -> Result<()> {
        update_ticket_metadata_handler(ctx, new_stage, new_uri)
    }

    pub fn upgrade_to_collectible(ctx: Context<UpgradeToCollectible>) -> Result<()> {
        upgrade_to_collectible_handler(ctx)
    }

    pub fn set_scanner(ctx: Context<SetScanner>, scanner: Pubkey) -> Result<()> {
        set_scanner_handler(ctx, scanner)
    }

    pub fn buy_event_ticket(
        ctx: Context<BuyEventTicketCtx>,
        ticket_price_lamports: u64,
        seat: Option<String>,
        ticket_id: u64,
    ) -> Result<()> {
        buy_event_ticket_handler(ctx, ticket_price_lamports, seat, ticket_id)
    }

    pub fn delete_event(
        ctx: Context<DeleteEventCtx>,
        event_id: u64,
    ) -> Result<()> {
        delete_event_handler(ctx, event_id)
    }

    pub fn update_event(
        ctx: Context<UpdateEventCtx>,
        event_id: u64,
        name: String,
        start_ts: i64,
        end_ts: i64,
        ticket_supply: u32,
        cover_image_url: String,
    ) -> Result<()> {
        update_event_handler(ctx, event_id, name, start_ts, end_ts, ticket_supply, cover_image_url)
    }
}
