use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::sysvar::clock::Clock;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::{
        CreateMasterEditionV3, CreateMasterEditionV3InstructionArgs, CreateMetadataAccountV3,
        CreateMetadataAccountV3InstructionArgs,
    },
    types::{Creator, DataV2},
};

use crate::{
    constants::{PROGRAM_SEED, TICKET_SEED},
    state::{EventAccount, TicketAccount, TicketStage},
};

#[derive(Accounts)]
#[instruction(seat: Option<String>)]
pub struct MintTicketCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(has_one = authority)]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + TicketAccount::INIT_SPACE,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            TICKET_SEED.as_bytes(),
            event_account.key().as_ref(),
            owner.key().as_ref()
        ],
        bump
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    /// CHECK: This is not checked in the handler - future ticket owner
    pub owner: UncheckedAccount<'info>,

    /// The mint account for the NFT ticket
    #[account(
        init,
        payer = authority,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            b"nft-mint",
            event_account.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump,
        mint::decimals = 0,
        mint::authority = ticket_account.key(),
        mint::freeze_authority = ticket_account.key(),
        mint::token_program = token_program,
    )]
    pub nft_mint: Account<'info, Mint>,
    

    /// CHECK: Metaplex Metadata PDA for the mint
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition PDA for the mint (same rationale as above).
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Owner's ATA for nft_mint
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = nft_mint,
        associated_token::authority = owner
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    /// CHECK: External Metaplex Token Metadata program.
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
}


pub fn handler(
    ctx: Context<MintTicketCtx>,
    seat: Option<String>,
    metadata_uri_override: Option<String>,
) -> Result<()> {
    let _event = &ctx.accounts.event_account;
    let nft_mint = &ctx.accounts.nft_mint;
    let authority = &ctx.accounts.authority;
  
    let event_key = _event.key();
    let owner_key = ctx.accounts.owner.key();
    let ticket_bump = ctx.bumps.ticket_account;

    // Define signer_seeds here so it's in scope for Metaplex CPIs
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            PROGRAM_SEED.as_bytes(),
            TICKET_SEED.as_bytes(),
            event_key.as_ref(),
            owner_key.as_ref(),
            &[ticket_bump],
        ]
    ];

    // 1) Mint 1 to ATA
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.ticket_account.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // Check if event has started to determine initial ticket stage
    let current_time = Clock::get()?.unix_timestamp;
    let event_has_started = current_time >= _event.start_ts;
    
    let ticket = &mut ctx.accounts.ticket_account;
    ticket.event = event_key;
    ticket.owner = owner_key;
    
    // Set ticket stage based on event timing
    if event_has_started {
        ticket.stage = TicketStage::Qr;
        msg!("Event has started, ticket minted in QR stage");
    } else {
        ticket.stage = TicketStage::Prestige;
        msg!("Event has not started, ticket minted in Prestige stage");
    }
    
    ticket.seat = seat.map(|mut s| { s.truncate(32); s });
    ticket.nft_mint = ctx.accounts.nft_mint.key();
    ticket.is_listed = false;
    ticket.bump = ticket_bump;

    // Create NFT metadata
    let creators = vec![Creator {
        address: ctx.accounts.authority.key(),
        verified: true,
        share: 100,
    }];

    // Helper to clamp string bytes
    fn clamp_bytes(mut s: String, max: usize) -> String {
        if s.len() > max {
            let mut cut = max;
            while !s.is_char_boundary(cut) { cut -= 1; }
            s.truncate(cut);
        }
        s
    }

    let mut metadata_uri = if let Some(uri) = metadata_uri_override {
        uri
    } else {
        ticket.stage.get_http_metadata_uri(&_event.name, ticket.seat.as_ref())
    };

    let mut name = ticket.stage.get_name(&_event.name, ticket.seat.as_ref());
    name = clamp_bytes(name, 32);

    let mut symbol = "TIX".to_string();
    symbol = clamp_bytes(symbol, 10);

    metadata_uri = clamp_bytes(metadata_uri, 200);

    let data_v2 = DataV2 {
        name,
        symbol,
        uri: metadata_uri,
        seller_fee_basis_points: 500,
        creators: Some(creators),
        collection: None,
        uses: None,
    };
    
    let metadata_args = CreateMetadataAccountV3InstructionArgs {
        data: data_v2,
        is_mutable: true,
        collection_details: None,
    };
    let metadat_ix = CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: nft_mint.key(),
        mint_authority: ctx.accounts.ticket_account.key(),
        payer: authority.key(),
        update_authority: (authority.key(), true).into(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }.instruction(metadata_args);

    let metadata_acct_infos = &[
        ctx.accounts.token_metadata_program.to_account_info(), // Metaplex Program
        ctx.accounts.metadata.to_account_info(),
        nft_mint.to_account_info(),
        ctx.accounts.ticket_account.to_account_info(), // mint authority
        authority.to_account_info(), // payer
        authority.to_account_info(), // update authority
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke_signed(&metadat_ix, metadata_acct_infos, signer_seeds)?;

    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0),
    };
    let master_edition_ix = CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.key(),
        mint: nft_mint.key(),
        update_authority: authority.key(),
        mint_authority: ctx.accounts.ticket_account.key(), // PDA is mint authority
        payer: authority.key(),
        metadata: ctx.accounts.metadata.key(),
        token_program: ctx.accounts.token_program.key(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }.instruction(master_edition_args);

    let master_edition_acct_infos = &[
        ctx.accounts.token_metadata_program.to_account_info(), // Metaplex Program
        ctx.accounts.master_edition.to_account_info(), // edition account (PDA)
        nft_mint.to_account_info(),
        authority.to_account_info(), // update authority
        ctx.accounts.ticket_account.to_account_info(), // mint authority
        authority.to_account_info(), // payer
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke_signed(&master_edition_ix, master_edition_acct_infos, signer_seeds)?;

    Ok(())
}