use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized operation for caller")]
    Unauthorized,
    #[msg("Invalid input parameter")]
    InvalidInput,
    #[msg("Event already initialized")]
    EventAlreadyInitialized,
    #[msg("Ticket already listed")]
    TicketAlreadyListed,
    #[msg("Ticket not listed")]
    TicketNotListed,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Listing expired")]
    ListingExpired,
    #[msg("Cannot list ticket in current stage")]
    CannotListInCurrentStage,
}
