use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeCtx {
}

pub fn handler(ctx: Context<InitializeCtx>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
