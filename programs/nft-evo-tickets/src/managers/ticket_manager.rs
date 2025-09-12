use crate::{BuyTicket};
use anchor_lang::prelude::*;
use solana_program::system_instruction::transfer;
use anchor_lang::solana_program::{program::invoke};

pub struct TicketManager {}

impl TicketManager {
    pub fn run_buy_ticket(ctx: Context<BuyTicket>, date_of_purchase: i64) -> Result<()> {
        let ticket = &mut ctx.accounts.ticket;
        let event = &ctx.accounts.event;

        if ctx.accounts.organizer.key() != event.organizer {
            return Err(TicketError::CreateTicketInvalidOrganizer.into());
        }

        ticket.event = event.key();
        ticket.price = event.ticket_price;
        ticket.date_of_purchase = date_of_purchase;
        ticket.owner = *ctx.accounts.owner.key;

        let lamports = ticket.price;

        invoke(
            &transfer(
                &ctx.accounts.owner.key(),
                &event.organizer,
                lamports,
            ),
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.organizer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }
}

#[error_code]
pub enum TicketError {
    #[msg("L'ticket organizer does not correspond the event organizer")]
    CreateTicketInvalidOrganizer,
}
