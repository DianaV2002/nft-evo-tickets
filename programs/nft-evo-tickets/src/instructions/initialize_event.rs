use anchor_lang::prelude::*;

use crate::constants::{EVENT_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::EventAccount;

#[derive(Accounts)]
#[instruction(event_id: u64, name: String, start_ts: i64, end_ts: i64)]
pub struct InitializeEventCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// PDA for the event: [PROGRAM_SEED, EVENT_SEED, event_id_le_bytes]
    #[account(
        init,
        payer = authority,
        space = 8 + EventAccount::INIT_SPACE,
        seeds = [PROGRAM_SEED.as_bytes(), EVENT_SEED.as_bytes(), &event_id.to_le_bytes()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeEventCtx>,
    event_id: u64,
    name: String,
    start_ts: i64,
    end_ts: i64,
) -> Result<()> {
    require!(name.len() <= 64, ErrorCode::InvalidInput);
    require!(end_ts > start_ts, ErrorCode::InvalidInput);

    let event_account = &mut ctx.accounts.event_account;
    event_account.authority = ctx.accounts.authority.key();
    event_account.event_id = event_id;
    event_account.name = name;
    event_account.start_ts = start_ts;
    event_account.end_ts = end_ts;
    event_account.tickets_sold = 0;
    event_account.ticket_supply = 0;
    event_account.version = 0; // Legacy version without ticket_supply
    event_account.cover_image_url = String::new(); // No cover image for legacy events
    event_account.bump = ctx.bumps.event_account;
    Ok(())
}

