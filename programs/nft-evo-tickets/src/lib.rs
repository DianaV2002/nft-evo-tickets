pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("5MAXo56hQiQGL9hd9HJi9xdUnJNLXor3XYyK9kC4bNBn");

#[program]
pub mod nft_evo_tickets {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
}
