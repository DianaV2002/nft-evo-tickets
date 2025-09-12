pub mod constants;
pub mod error;
pub mod instructions;
pub mod managers;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

use managers::event_manager::EventManager;
use managers::ticket_manager::TicketManager;

declare_id!("5MAXo56hQiQGL9hd9HJi9xdUnJNLXor3XYyK9kC4bNBn");

#[program]
pub mod nft_evo_tickets {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
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