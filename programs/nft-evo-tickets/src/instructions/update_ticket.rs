use anchor_lang::prelude::*;
use crate::state::{EventAccount, TicketAccount, TicketStage};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct UpdateTicket<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        has_one = authority,
        has_one = scanner
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        constraint = ticket_account.event == event_account.key()
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    /// CHECK: The authority of the event account.
    pub authority: UncheckedAccount<'info>,
    /// CHECK: The scanner of the event account.
    pub scanner: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<UpdateTicket>, new_stage: TicketStage) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket_account;
    let signer = &ctx.accounts.signer;

    match new_stage {
        TicketStage::Qr => {
            // Only the event authority can move a ticket to the QR stage.
            require!(signer.key() == ctx.accounts.authority.key(), ErrorCode::Unauthorized);
            ticket.stage = TicketStage::Qr;
        },
        TicketStage::Scanned => {
            // Only the designated scanner can mark a ticket as scanned.
            require!(signer.key() == ctx.accounts.scanner.key(), ErrorCode::Unauthorized);
            require!(ticket.stage == TicketStage::Qr, ErrorCode::InvalidTicketStage);
            ticket.stage = TicketStage::Scanned;
            ticket.was_scanned = true;
        },
        _ => {
            return err!(ErrorCode::InvalidTicketStage);
        }
    }

    Ok(())
}
