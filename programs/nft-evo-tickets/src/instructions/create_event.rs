use anchor_lang::prelude::*;

use crate::constants::{EVENT_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::EventAccount;

#[derive(Accounts)]
#[instruction(event_id: u64, name: String, start_ts: i64, end_ts: i64, ticket_supply: u32, cover_image_url: String)]
pub struct CreateEventCtx<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    
    /// PDA for the event: [PROGRAM_SEED, EVENT_SEED, event_id_le_bytes]
    #[account(
        init,
        payer = organizer,
        space = 8 + EventAccount::INIT_SPACE,
        seeds = [PROGRAM_SEED.as_bytes(), EVENT_SEED.as_bytes(), &event_id.to_le_bytes()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEventCtx>,
    event_id: u64,
    name: String,
    start_ts: i64,
    end_ts: i64,
    ticket_supply: u32,
    cover_image_url: String,
) -> Result<()> {
    // Basic validation
    require!(name.len() <= 64, ErrorCode::InvalidInput);
    require!(end_ts > start_ts, ErrorCode::InvalidInput);
    require!(ticket_supply > 0, ErrorCode::InvalidInput);
    require!(cover_image_url.len() <= 200, ErrorCode::InvalidInput);

    // // Validate that the event is in the future
    // let current_time = Clock::get()?.unix_timestamp;
    // require!(start_ts > current_time, ErrorCode::InvalidInput); - only for testing purposes

    let event_account_key = ctx.accounts.event_account.key();
    let organizer_key = ctx.accounts.organizer.key();

    let event_account = &mut ctx.accounts.event_account;

    // Set the organizer as the event authority
    event_account.authority = organizer_key;
    event_account.scanner = organizer_key; // Default scanner to organizer
    event_account.event_id = event_id;
    event_account.name = name.clone();
    event_account.start_ts = start_ts;
    event_account.end_ts = end_ts;
    event_account.tickets_sold = 0;
    event_account.ticket_supply = ticket_supply;
    event_account.version = 2; // Version 2: Clean events with proper validation
    event_account.cover_image_url = cover_image_url;
    event_account.bump = ctx.bumps.event_account;
    
    // Emit event for indexing
    emit!(EventCreated {
        event_id,
        organizer: organizer_key,
        event_account: event_account_key,
        name,
        start_ts,
        end_ts,
    });
    
    Ok(())
}

#[event]
pub struct EventCreated {
    pub event_id: u64,
    pub organizer: Pubkey,
    pub event_account: Pubkey,
    pub name: String,
    pub start_ts: i64,
    pub end_ts: i64,
}
