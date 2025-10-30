use anchor_lang::prelude::*;

use crate::constants::{EVENT_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::EventAccount;

#[derive(Accounts)]
#[instruction(event_id: u64, name: String, start_ts: i64, end_ts: i64, ticket_supply: u32, cover_image_url: String)]
pub struct UpdateEventCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// PDA for the event: [PROGRAM_SEED, EVENT_SEED, event_id_le_bytes]
    #[account(
        mut,
        seeds = [PROGRAM_SEED.as_bytes(), EVENT_SEED.as_bytes(), &event_id.to_le_bytes()],
        bump = event_account.bump,
        constraint = event_account.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub event_account: Account<'info, EventAccount>,
}

pub fn handler(
    ctx: Context<UpdateEventCtx>,
    event_id: u64,
    name: String,
    start_ts: i64,
    end_ts: i64,
    ticket_supply: u32,
    cover_image_url: String,
) -> Result<()> {
    require!(name.len() <= 64, ErrorCode::InvalidInput);
    require!(end_ts > start_ts, ErrorCode::InvalidInput);
    require!(ticket_supply > 0, ErrorCode::InvalidInput);
    require!(cover_image_url.len() <= 200, ErrorCode::InvalidInput);

    let current_time = Clock::get()?.unix_timestamp;
    require!(current_time < ctx.accounts.event_account.start_ts, ErrorCode::EventAlreadyStarted);

    require!(ctx.accounts.event_account.tickets_sold == 0, ErrorCode::TicketsAlreadySold);

    let event_account = &mut ctx.accounts.event_account;

    event_account.name = name.clone();
    event_account.start_ts = start_ts;
    event_account.end_ts = end_ts;
    event_account.ticket_supply = ticket_supply;
    event_account.cover_image_url = cover_image_url;

    emit!(EventUpdated {
        event_id,
        authority: ctx.accounts.authority.key(),
        event_account: event_account.key(),
        name,
        start_ts,
        end_ts,
        ticket_supply,
    });
    
    Ok(())
}

#[event]
pub struct EventUpdated {
    pub event_id: u64,
    pub authority: Pubkey,
    pub event_account: Pubkey,
    pub name: String,
    pub start_ts: i64,
    pub end_ts: i64,
    pub ticket_supply: u32,
}
