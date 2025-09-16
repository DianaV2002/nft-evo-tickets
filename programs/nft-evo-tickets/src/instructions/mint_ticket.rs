use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, rent::Rent};
use anchor_lang::solana_program::system_instruction;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, InitializeMint2, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::instructions::{CreateMasterEditionV3, CreateMasterEditionV3InstructionArgs, CreateMetadataAccountV3, CreateMetadataAccountV3InstructionArgs};
use mpl_token_metadata::types::{Collection, Creator, DataV2};
use anchor_lang::solana_program::program_pack::Pack; 
use anchor_spl::token::spl_token::state::Mint as SplTokenMint;

use crate::constants::{PROGRAM_SEED, TICKET_SEED};
use crate::state::{EventAccount, TicketAccount, TicketStage};

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
        space = TicketAccount::SPACE,
        seeds = [
            PROGRAM_SEED.as_bytes(),
            TICKET_SEED.as_bytes(),
            event_account.key().as_ref(),
            owner.key().as_ref()
        ],
        bump
    )]
    pub ticket_account: Account<'info, TicketAccount>,

    /// Future ticket owner (no signature required)
    pub owner: SystemAccount<'info>,

    /// CHECK: Mint account is created in this instruction via System Program, then initialized via SPL Token CPI.
    /// Seeds/signature are validated by using our program-derived seeds when invoking `create_account`.
    #[account(mut)]
    pub nft_mint: UncheckedAccount<'info>,

    /// CHECK: Metaplex Metadata PDA for the mint. We don't deserialize; address is derived off-chain/on client
    /// and verified here by comparing with expected PDA if desired.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition PDA for the mint (same rationale as above).
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    // Create owner's ATA if needed
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
    pub token_metadata_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
}


pub fn handler(
    ctx: Context<MintTicketCtx>,
    seat: Option<String>,
) -> Result<()> {
    let _event = &ctx.accounts.event_account;
    let nft_mint = &ctx.accounts.nft_mint;
    let authority = &ctx.accounts.authority;
  
    let event_key = _event.key();
    let owner_key = ctx.accounts.owner.key();
    let ticket_bump = ctx.bumps.ticket_account;

    let ticket = &mut ctx.accounts.ticket_account;

    // Define signer_seeds here so it's in scope for Metaplex CPIs
    let signer_seeds: &[&[&[u8]]] = &[&[PROGRAM_SEED.as_bytes(), TICKET_SEED.as_bytes(), event_key.as_ref(), owner_key.as_ref(), &[ticket_bump]]];

    // 1) Allocate + fund the mint account via System Program
    let rent_lamports = Rent::get()?.minimum_balance(SplTokenMint::LEN);
    let create_ix = system_instruction::create_account(
        &authority.key(),
        &nft_mint.key(),
        rent_lamports,
        SplTokenMint::LEN as u64,
        &ctx.accounts.token_program.key(), // program owner = token program
    );
    invoke_signed(
        &create_ix,
        &[
            authority.to_account_info(),
            nft_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    // 2) Initialize the mint (decimals = 0 for NFTs/tickets)
    token::initialize_mint2(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            InitializeMint2 {
                mint: nft_mint.to_account_info(),
            },
            signer_seeds,
        ),
        0,                    // decimals
        &authority.key(),         // mint_authority
        None,                 // freeze_authority
    )?;

    // 3) Mint 1 token to owner's ATA (created above with init_if_needed)
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: nft_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: authority.to_account_info(), // mint authority
            },
            signer_seeds,
        ),
        1,
    )?;

    // Set up ticket account
    ticket.event = ctx.accounts.event_account.key();
    ticket.owner = ctx.accounts.owner.key();
    ticket.stage = TicketStage::Qr; // Start as QR stage
    ticket.seat = seat.map(|mut s| {
        s.truncate(TicketAccount::MAX_SEAT_LEN);
        s
    });
    ticket.nft_mint = nft_mint.key(); // Link to NFT
    ticket.is_listed = false;
    ticket.bump = ticket_bump;

    // Create NFT metadata
    let creators = vec![Creator {
        address: ctx.accounts.authority.key(),
        verified: true,
        share: 100,
    }];

    let metadata_uri = ticket.stage.get_http_metadata_uri(&_event.name, ticket.seat.as_ref());
    let name = ticket.stage.get_name(&_event.name, ticket.seat.as_ref());
    let symbol = "TIX".to_string(); // Or a dynamic symbol

    let data_v2 = DataV2 {
        name,
        symbol,
        uri: metadata_uri,
        seller_fee_basis_points: 500, // 5% royalties
        creators: Some(creators),
        collection: Some(Collection {
            verified: false,
            key: _event.key(),
        }),
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
        mint_authority: authority.key(),
        payer: authority.key(),
        update_authority: (authority.key(), true).into(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }.instruction(metadata_args);

    let metadata_acct_infos = &[
        ctx.accounts.token_metadata_program.to_account_info(), // Metaplex Program
        ctx.accounts.metadata.to_account_info(),
        nft_mint.to_account_info(),
        authority.to_account_info(), // mint authority
        authority.to_account_info(), // payer
        authority.to_account_info(), // update authority
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke_signed(&metadat_ix, metadata_acct_infos, signer_seeds)?;

    // Create Master Edition
    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: None,
    };
    let master_edition_ix = CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.key(),
        mint: nft_mint.key(),
        update_authority: authority.key(),
        mint_authority: authority.key(),
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
        authority.to_account_info(), // mint authority
        authority.to_account_info(), // payer
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke_signed(&master_edition_ix, master_edition_acct_infos, signer_seeds)?;

    Ok(())
}