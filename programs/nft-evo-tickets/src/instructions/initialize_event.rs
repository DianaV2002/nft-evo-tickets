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
        space = EventAccount::SPACE,
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
    require!(name.len() <= EventAccount::MAX_NAME_LEN, ErrorCode::InvalidInput);

    let event_account = &mut ctx.accounts.event_account;
    event_account.authority = ctx.accounts.authority.key();
    event_account.event_id = event_id;
    event_account.name = name;
    event_account.start_ts = start_ts;
    event_account.end_ts = end_ts;
    event_account.bump = ctx.bumps.event_account;
    Ok(())
}

