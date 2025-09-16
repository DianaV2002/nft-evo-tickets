use anchor_lang::prelude::*;

#[account]
pub struct EventAccount {
    pub authority: Pubkey,
    pub event_id: u64,
    pub name: String,
    pub start_ts: i64,
    pub end_ts: i64,
    pub bump: u8,
}

impl EventAccount {
    pub const MAX_NAME_LEN: usize = 64; // bytes
    pub const SPACE: usize = 8  // discriminator
        + 32                   // authority
        + 8                    // event_id
        + (4 + Self::MAX_NAME_LEN) // name
        + 8                    // start_ts
        + 8                    // end_ts
        + 1;                  // bump
}


#[account]
pub struct TicketAccount {
    pub event: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey, // Public key of the NFT mint
    pub seat: Option<String>,
    pub stage: TicketStage,
    pub is_listed: bool,
    pub listing_price: Option<u64>,
    pub listing_expires_at: Option<i64>,
    pub bump: u8,
}

impl TicketAccount {
    pub const MAX_SEAT_LEN: usize = 32;
    pub const SPACE: usize = 8 // discriminator
        + 32 // event: Pubkey
        + 32 // owner: Pubkey
        + 32 // nft_mint: Pubkey
        + (1 + 4 + Self::MAX_SEAT_LEN) // seat: Option<String>
        + 1 // stage: TicketStage (size of enum)
        + 1 // is_listed: bool
        + (1 + 8) // listing_price: Option<u64>
        + (1 + 8) // listing_expires_at: Option<i64>
        + 1; // bump: u8
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TicketStage {
    Qr,
}

impl TicketStage {
    pub fn get_name(&self, event_name: &str, seat: Option<&String>) -> String {
        let seat_str = seat.map_or("".to_string(), |s| format!(" ({})", s));
        match self {
            TicketStage::Qr => format!("{} Ticket QR{}", event_name, seat_str),
        }
    }

    pub fn get_description(&self, event_name: &str, seat: Option<&String>) -> String {
        let seat_str = seat.map_or("".to_string(), |s| format!(" Seat: {}", s));
        match self {
            TicketStage::Qr => format!("QR code for {} ticket.{}", event_name, seat_str),
        }
    }

    pub fn get_http_metadata_uri(&self, _event_name: &str, _seat: Option<&String>) -> String {
        // Placeholder for a metadata URI service or a base URI
        // In a real application, this would point to a JSON metadata file
        // For simplicity, we'll return a generic URI.
        "https://example.com/ticket-metadata/qr".to_string()
    }
}

#[account]
pub struct ListingAccount {
    pub ticket: Pubkey,
    pub seller: Pubkey,
    pub price_lamports: u64,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub bump: u8,
}

impl ListingAccount {
    pub const SPACE: usize = 8  // discriminator
        + 32                   // ticket
        + 32                   // seller
        + 8                    // price_lamports
        + 8                    // created_at
        + 1 + 8               // Option<i64> expires_at
        + 1;                  // bump
}