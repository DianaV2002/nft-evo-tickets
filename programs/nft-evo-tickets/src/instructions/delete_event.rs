use anchor_lang::prelude::*;

use crate::constants::{EVENT_SEED, PROGRAM_SEED};
use crate::error::ErrorCode;
use crate::state::EventAccount;

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct DeleteEventCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA for the event: [PROGRAM_SEED, EVENT_SEED, event_id_le_bytes]
    #[account(
        mut,
        close = authority,
        seeds = [PROGRAM_SEED.as_bytes(), EVENT_SEED.as_bytes(), &event_id.to_le_bytes()],
        bump = event_account.bump,
        constraint = event_account.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub event_account: Account<'info, EventAccount>,
}

pub fn handler(
    ctx: Context<DeleteEventCtx>,
    _event_id: u64,
) -> Result<()> {
    let event_account = &ctx.accounts.event_account;

    // Emit event for indexing
    emit!(EventDeleted {
        event_id: event_account.event_id,
        authority: ctx.accounts.authority.key(),
        event_account: event_account.key(),
    });

    // The account will be automatically closed due to the `close = authority` constraint
    // This will delete the event regardless of tickets sold
    Ok(())
}

#[event]
pub struct EventDeleted {
    pub event_id: u64,
    pub authority: Pubkey,
    pub event_account: Pubkey,
}
