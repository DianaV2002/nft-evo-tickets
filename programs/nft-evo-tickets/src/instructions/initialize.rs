use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeCtx {
    // No accounts needed for this simple instruction
}

pub fn handler(ctx: Context<InitializeCtx>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
