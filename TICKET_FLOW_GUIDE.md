# NFT Ticket System - User Guide

## How the Ticket System Works

### Current Program Constraints

1. **One Ticket Per Wallet Per Event**: Each Solana wallet address can only hold ONE ticket for a given event
2. **Only Event Organizers Can Mint**: The `mintTicket` instruction requires the event authority (organizer) to sign
3. **Marketplace for Distribution**: Tickets must be listed on the marketplace for users to purchase

### Ticket Lifecycle

```
1. Event Organizer Creates Event
   ↓
2. Organizer Mints Tickets (to different wallets)
   ↓
3. Ticket Holders List Tickets on Marketplace
   ↓
4. Users Buy Tickets from Marketplace
   ↓
5. Tickets Get Scanned at Event
   ↓
6. Tickets Evolve to Collectibles
```

### For Event Organizers

**To distribute tickets for your event:**

1. **Create Event** - Use the Create Event page
2. **Mint Tickets** - You have two options:

   **Option A: Pre-mint to buyer wallets**
   - Collect wallet addresses from buyers
   - Mint tickets directly to their wallets using the mint script
   - Example: `npx ts-node scripts/mint-ticket.ts <EVENT_KEY> <BUYER_WALLET>`

   **Option B: Mint to yourself and list on marketplace**
   - Create multiple Solana wallets
   - Mint one ticket to each wallet
   - List those tickets for sale on the marketplace
   - Users purchase from the marketplace

### For Ticket Buyers

**To buy a ticket:**

1. **Browse Events** - Go to the Events page
2. **Check Marketplace** - Go to the Marketplace page to see available tickets
3. **Buy Ticket** - Purchase a ticket from the marketplace listings
4. **View Your Tickets** - Check the Tickets page to see your tickets

### Limitations in Current Version

- **No Primary Sales**: Regular users cannot directly purchase tickets from the event page
- **Manual Distribution**: Organizers must manually mint tickets to buyer wallets
- **Single Wallet Constraint**: Each wallet can only have one ticket per event

### For Production

To enable direct ticket purchases, you would need to:

1. **Add Payment Processing**: Integrate Solana Pay or similar
2. **Modify Smart Contract**: Add a `purchaseTicket` instruction that:
   - Accepts payment from buyer
   - Transfers funds to organizer
   - Mints ticket to buyer
3. **Implement Ticket Pool**: Create a pool system where tickets aren't pre-minted

## Scripts Available

### Check Your Tickets
```bash
npx ts-node scripts/check-my-tickets.ts
```

### Check Events with Tickets
```bash
npx ts-node scripts/check-my-events.ts
```

### Debug Specific Ticket
```bash
npx ts-node scripts/debug-ticket.ts
```
