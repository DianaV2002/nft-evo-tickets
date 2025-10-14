use anchor_lang::prelude::*;

// ---------- EventAccount ----------
#[account]
#[derive(InitSpace)]
pub struct EventAccount {
    pub authority: Pubkey,
    pub scanner: Pubkey,
    pub event_id: u64,
    #[max_len(64)]
    pub name: String,
    pub start_ts: i64,
    pub end_ts: i64,
    pub tickets_sold: u32,
    pub ticket_supply: u32,
    pub version: u8, // Version field for tracking event format changes
    #[max_len(200)]
    pub cover_image_url: String, // IPFS or external URL for event cover photo
    pub bump: u8,
}

// ---------- TicketAccount ----------
#[account]
#[derive(InitSpace)]
pub struct TicketAccount {
    pub event: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    #[max_len(32)]
    pub seat: Option<String>,
    pub stage: TicketStage,
    pub is_listed: bool,
    pub was_scanned: bool,
    pub listing_price: Option<u64>,
    pub listing_expires_at: Option<i64>,
    pub bump: u8,
}

// ---------- Enum ----------
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
#[repr(u8)] //1 byte
pub enum TicketStage {
    Prestige = 0,
    Qr = 1,
    Scanned = 2,
    Collectible = 3,
}

impl TicketStage {
    pub fn get_http_metadata_uri(&self, event_name: &str, seat: Option<&String>) -> String {
        match self {
            TicketStage::Prestige => get_prestige_metadata_uri(event_name, seat),
            TicketStage::Qr => get_qr_code_metadata_uri(event_name, seat),
            TicketStage::Scanned => get_scanned_metadata_uri(event_name, seat),
            TicketStage::Collectible => get_collectible_metadata_uri(event_name, seat),
        }
    }

    pub fn get_name(&self, event_name: &str, seat: Option<&String>) -> String {
        // Metaplex has a 32-character limit for NFT names
        // Format: "TIX • {event} • {seat}" but truncate event name if needed
        let seat_str = seat.map_or("".to_string(), |s| s.clone());
        let prefix = "TIX • ";
        let separator = if !seat_str.is_empty() { " • " } else { "" };

        // Calculate available space: 32 - prefix - separator - seat
        let available_for_event = 32_usize
            .saturating_sub(prefix.len())
            .saturating_sub(separator.len())
            .saturating_sub(seat_str.len());

        // Truncate event name if necessary
        let truncated_event = if event_name.len() > available_for_event {
            &event_name[..available_for_event]
        } else {
            event_name
        };

        match self {
            TicketStage::Prestige => format!("{}{}{}{}", prefix, truncated_event, separator, seat_str),
            TicketStage::Qr => format!("{}{}{}{}", prefix, truncated_event, separator, seat_str),
            TicketStage::Scanned => format!("{}{}{}{}", prefix, truncated_event, separator, seat_str),
            TicketStage::Collectible => format!("{}{}{}{}", prefix, truncated_event, separator, seat_str),
        }
    }
}

fn get_prestige_metadata_uri(event_name: &str, seat: Option<&String>) -> String {
    format!("https://example.com/tickets/prestige/{}/{}/metadata.json", event_name.replace(" ", "-"), seat.map_or("".to_string(), |s| s.clone()))
}

fn get_qr_code_metadata_uri(event_name: &str, seat: Option<&String>) -> String {
    format!("https://example.com/tickets/qr/{}/{}/metadata.json", event_name.replace(" ", "-"), seat.map_or("".to_string(), |s| s.clone()))
}

fn get_scanned_metadata_uri(event_name: &str, seat: Option<&String>) -> String {
    format!("https://example.com/tickets/scanned/{}/{}/metadata.json", event_name.replace(" ", "-"), seat.map_or("".to_string(), |s| s.clone()))
}

fn get_collectible_metadata_uri(event_name: &str, seat: Option<&String>) -> String {
    format!("https://example.com/tickets/collectible/{}/{}/metadata.json", event_name.replace(" ", "-"), seat.map_or("".to_string(), |s| s.clone()))
}

// ---------- ListingAccount ----------
#[account]
#[derive(InitSpace)]
pub struct ListingAccount {
    pub ticket: Pubkey,
    pub seller: Pubkey,
    pub price_lamports: u64,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub bump: u8,
}
