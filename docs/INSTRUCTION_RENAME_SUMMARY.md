# Instruction Rename Summary

## Changes Made

Renamed instructions for better clarity:

### Before → After

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `buy_ticket` | `buy_marketplace_ticket` | Buy a ticket from the secondary market (marketplace) |
| `purchase_ticket` | `buy_event_ticket` | Buy a ticket directly from the event organizer (primary market) |

## Rationale

The old names were confusing:
- ❌ `buy_ticket` - Unclear which market
- ❌ `purchase_ticket` - Sounds similar to buy_ticket

The new names are crystal clear:
- ✅ `buy_marketplace_ticket` - Obviously from marketplace
- ✅ `buy_event_ticket` - Obviously from event

## Updated Files

### Solana Program

1. **Renamed Files:**
   - `buy_ticket.rs` → `buy_marketplace_ticket.rs`
   - `purchase_ticket.rs` → `buy_event_ticket.rs`

2. **Updated Structs:**
   - `BuyTicketCtx` → `BuyMarketplaceTicketCtx`
   - `PurchaseTicketCtx` → `BuyEventTicketCtx`

3. **Updated Functions:**
   - `buy_ticket()` → `buy_marketplace_ticket()`
   - `purchase_ticket()` → `buy_event_ticket()`

4. **Updated References:**
   - [mod.rs](../programs/nft-evo-tickets/src/instructions/mod.rs)
   - [lib.rs](../programs/nft-evo-tickets/src/lib.rs)

### Frontend

1. **Function Names:**
   - `purchaseTicket()` → `buyEventTicket()`
   - `buyTicket()` → `buyMarketplaceTicket()`

2. **Updated Files:**
   - [ticketService.ts](../frontend/src/services/ticketService.ts#L255)
   - [Events.tsx](../frontend/src/pages/Events.tsx#L10)

## Deployment

- **Transaction**: `5HnTUcK7LTDaDEeQQW3Zvgnt9Vr2Ntm6HU2wPk6awbsVVJdRbspnyZ25atofc6xh4Aqp1ApD4DMiyHzXRYtgfkup`
- **Program ID**: `6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc`
- **Network**: Solana Devnet

## Usage Examples

### Buy from Event (Primary Market)

```typescript
import { buyEventTicket } from "@/services/ticketService"

// Buy a new ticket directly from the event
await buyEventTicket(
  connection,
  wallet,
  eventPublicKey,
  0.1 * LAMPORTS_PER_SOL, // price
  "A-12" // optional seat
)
```

### Buy from Marketplace (Secondary Market)

```typescript
import { buyMarketplaceTicket } from "@/services/ticketService"

// Buy a resold ticket from another user
await buyMarketplaceTicket(
  connection,
  wallet,
  ticketPublicKey,
  listingPublicKey
)
```

## Complete Ticket Flow

```
┌─────────────────────────────────────────┐
│         PRIMARY MARKET                   │
│                                          │
│  User → buy_event_ticket() → Organizer  │
│         (mints new NFT)                  │
└─────────────────────────────────────────┘
                 │
                 │ Owner lists ticket
                 ↓
┌─────────────────────────────────────────┐
│        SECONDARY MARKET                  │
│                                          │
│  User → buy_marketplace_ticket() → Seller│
│         (transfers existing NFT)         │
└─────────────────────────────────────────┘
```

## Benefits

✅ **Clear Intent**: Function names immediately convey their purpose
✅ **No Confusion**: Developers know exactly which market they're interacting with
✅ **Better DX**: Improved developer experience with self-documenting code
✅ **Maintainability**: Easier to understand and maintain codebase

## Migration Guide

If you have existing code using the old names:

### TypeScript/Frontend
```typescript
// OLD
import { purchaseTicket, buyTicket } from "@/services/ticketService"
await purchaseTicket(...)
await buyTicket(...)

// NEW
import { buyEventTicket, buyMarketplaceTicket } from "@/services/ticketService"
await buyEventTicket(...)
await buyMarketplaceTicket(...)
```

### Rust/Program
```rust
// OLD
program.methods.purchase_ticket(...).rpc()
program.methods.buy_ticket(...).rpc()

// NEW
program.methods.buy_event_ticket(...).rpc()
program.methods.buy_marketplace_ticket(...).rpc()
```

## Notes

- Both instructions remain fully functional
- No breaking changes to existing tickets
- IDL has been updated with new names
- All tests pass with new names
