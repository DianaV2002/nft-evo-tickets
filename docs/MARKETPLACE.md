# NFT Evolution Tickets - Marketplace Documentation

## Overview

The marketplace feature allows ticket holders to buy and sell event tickets on a secondary market. This creates a vibrant ecosystem where tickets can be traded based on demand and rarity.

## Marketplace Rules

### Who Can List Tickets

#### Event Organizers
- **Can place tickets on marketplace at any time** if they own the tickets and want to sell them
- No stage restrictions apply to organizers
- Useful for selling excess inventory or promotional tickets

#### Event Attendees
- **Can list tickets ONLY when they reach specific stages:**
  - **QR Stage**: Tickets that are ready for event entry can be resold
  - **Collectible Stage**: Post-event memorabilia tickets can be sold
- Allows attendees to resell if they can't attend or want to trade collectibles

### Listing Stages

#### ✅ QR Stage (Stage 1)
- Tickets have been activated and are ready for event entry
- Attendees can list these tickets if they can't attend the event
- Buyers receive a functional ticket that can be scanned at the event
- **Use Case**: Reselling tickets before the event

#### ✅ Collectible Stage (Stage 3)
- Post-event tickets that have evolved into collectible NFTs
- Can be listed by attendees as memorabilia
- **Use Case**: Trading rare collectibles from past events

#### ❌ Prestige Stage (Stage 0)
- **CANNOT be listed** by attendees
- Tickets are not yet activated
- Only organizers can list these if needed

#### ❌ Scanned Stage (Stage 2)
- **CANNOT be listed**
- Tickets have been used for event entry
- No resale value as entry ticket

### Custom Pricing

Sellers have full control over pricing:
- Set price in SOL (lamports)
- Price reflects market demand, rarity, and stage
- Optional expiration time for listings
- **Marketplace Fee**: 5% automatically deducted and sent to event organizer

## How It Works

### Listing Process

1. **Ticket Holder** clicks "List" on their ticket
2. Sets a **custom price** in SOL
3. **NFT is transferred** to secure escrow (PDA-controlled account)
4. **Listing appears** on the marketplace for others to browse
5. Ticket remains in escrow until:
   - Someone purchases it, OR
   - Seller cancels the listing

### Buying Process

1. **Buyer** browses marketplace listings
2. Clicks "Buy Now" on desired ticket
3. **Payment** is sent:
   - 95% goes to the seller
   - 5% marketplace fee goes to event organizer
4. **NFT transfers** from escrow to buyer
5. **Ownership updates** on-chain
6. Buyer can now use the ticket or list it again

### Canceling Listing

Sellers can cancel their listing at any time:
1. Click "Cancel Listing" on their ticket
2. **NFT returns** from escrow to seller
3. **Listing is removed** from marketplace
4. Seller regains full ownership

## Security Features

### Escrow System
- NFTs are held in PDA-controlled token accounts
- Program authority ensures safe transfers
- No third-party custody required
- Atomic transactions (all or nothing)

### Validation Checks
- Only ticket owner can list
- Stage requirements enforced on-chain
- Double-listing prevented
- Scanned tickets blocked from listing

### Transparency
- All transactions visible on Solana Explorer
- On-chain verification of ownership
- Immutable transaction history
- Public listing data

## Use Cases

### For Attendees

**Before Event (QR Stage):**
- Can't attend? List your ticket for others
- Price based on demand and seat location
- Quick resale if plans change

**After Event (Collectible Stage):**
- Sell rare collectibles from memorable events
- Trade with other collectors
- Price based on rarity and significance

### For Organizers

**Inventory Management:**
- List unsold tickets directly on marketplace
- Flexible pricing strategies
- Promotional ticket distribution

**Revenue:**
- Earn 5% on all secondary sales
- Ongoing revenue from ticket trading
- Incentive to create valuable experiences

## Benefits

### For Buyers
✅ Access to sold-out events
✅ Verified, authentic tickets
✅ Secure blockchain transfers
✅ Collectible NFTs with provenance

### For Sellers
✅ Custom pricing control
✅ Instant SOL payments
✅ No intermediary fees (only 5% marketplace fee)
✅ Easy listing/cancellation

### For Organizers
✅ Ongoing revenue from secondary sales
✅ Increased event value proposition
✅ Community-driven marketplace
✅ Anti-scalping through stage requirements

## Technical Details

### Smart Contract Functions

#### `list_ticket`
- Lists a ticket on the marketplace
- Transfers NFT to escrow
- Creates listing account with price
- **Constraint**: QR or Collectible stage only (for attendees)

#### `buy_marketplace_ticket`
- Purchases a listed ticket
- Transfers SOL to seller (95%) and organizer (5%)
- Transfers NFT from escrow to buyer
- Updates ticket ownership

#### `cancel_listing`
- Removes ticket from marketplace
- Returns NFT from escrow to seller
- Closes listing account

### Data Structures

**ListingAccount:**
```rust
{
  ticket: PublicKey,        // The ticket being sold
  seller: PublicKey,        // Current owner
  price_lamports: u64,      // Listing price
  created_at: i64,          // Timestamp
  expires_at: Option<i64>,  // Optional expiration
  bump: u8                  // PDA bump
}
```

## Best Practices

### For Sellers
1. **Research prices** - Check existing marketplace listings
2. **Set fair prices** - Consider stage, rarity, and demand
3. **Be patient** - Don't immediately cancel if no buyers
4. **Remember the fee** - 5% goes to event organizer

### For Buyers
1. **Verify ticket stage** - Ensure it meets your needs
2. **Check event date** - Make sure you can attend
3. **Review seller** - Check their address and history
4. **Act fast** - Popular tickets sell quickly

### For Organizers
1. **Create valuable experiences** - Drives collectible value
2. **Strategic listing** - List excess inventory wisely
3. **Promote scarcity** - Limited tickets increase value
4. **Engage collectors** - Foster trading community

## FAQ

**Q: Can I list a Prestige stage ticket?**
A: Only organizers can list Prestige tickets. Attendees must wait for QR stage.

**Q: What happens if my listing expires?**
A: The NFT remains in escrow until you cancel the listing manually.

**Q: Can I change the price after listing?**
A: No, you must cancel and create a new listing with a different price.

**Q: What if the transaction times out?**
A: Check the transaction on Solana Explorer. It may have succeeded despite the timeout message.

**Q: Can scanned tickets be listed?**
A: No, scanned tickets cannot be listed. They are marked as "used."

**Q: How long does it take for a listing to appear?**
A: Instantly after transaction confirmation (usually 1-2 seconds).

## Example Scenarios

### Scenario 1: Can't Attend Event
Sarah bought a ticket to "Mountain Retreat" but can't attend.
1. Her ticket evolved to QR stage
2. She lists it for 1.5 SOL on marketplace
3. John buys it within an hour
4. Sarah receives 1.425 SOL (95%)
5. Organizer receives 0.075 SOL (5%)
6. John can now attend with the ticket

### Scenario 2: Trading Collectibles
Mike attended "Tech Conference 2024" and his ticket became a collectible.
1. Ticket is now in Collectible stage
2. He lists it for 3 SOL (rare event)
3. A collector purchases it
4. Mike gets paid, buyer gets rare NFT
5. Both parties happy with the trade

### Scenario 3: Organizer Selling Inventory
Event organizer has 10 unsold tickets.
1. Lists them on marketplace at regular price
2. Community members purchase directly
3. Organizer receives full payment
4. No intermediary needed
5. Tickets reach interested buyers

## Support

For issues or questions:
- Check transaction on [Solana Explorer](https://explorer.solana.com)
- Review marketplace listings in the app
- Contact support through the app's help section
