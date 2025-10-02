use anchor_lang::prelude::*;
use crate::state::EventAccount;

#[derive(Accounts)]
pub struct SetScanner<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority
    )]
    pub event_account: Account<'info, EventAccount>,
}

pub fn handler(ctx: Context<SetScanner>, scanner: Pubkey) -> Result<()> {
    ctx.accounts.event_account.scanner = scanner;
    Ok(())
}
