use anchor_lang::prelude::*;
use crate::state::{EventAccount, TicketAccount, TicketStage};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct UpgradeToCollectible<'info> {
    pub user: Signer<'info>,

    #[account(
        constraint = Clock::get()?.unix_timestamp > event_account.end_ts @ ErrorCode::EventNotOver
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        constraint = ticket_account.event == event_account.key(),
        constraint = ticket_account.was_scanned == true @ ErrorCode::TicketNotScanned,
        constraint = ticket_account.stage == TicketStage::Scanned @ ErrorCode::InvalidTicketStage
    )]
    pub ticket_account: Account<'info, TicketAccount>,
}

pub fn handler(ctx: Context<UpgradeToCollectible>) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket_account;
    ticket.stage = TicketStage::Collectible;
    Ok(())
}
