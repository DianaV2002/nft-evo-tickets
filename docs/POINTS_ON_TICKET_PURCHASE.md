# Points Reward on Ticket Purchase

## Implementation

Added automatic points reward when users purchase tickets from events.

## Changes Made

### Frontend - Events.tsx

Added points recording after successful ticket purchase in [Events.tsx](../frontend/src/pages/Events.tsx#L80-L95):

```typescript
// Record activity for points
try {
  const result = await recordActivity(
    wallet.publicKey.toString(),
    'TICKET_PURCHASED',
    tx,
    { eventName: selectedEvent.name }
  )

  if (result.success && result.pointsEarned > 0) {
    toast.success(`+${result.pointsEarned} points earned!`)
  }
} catch (activityError) {
  console.error('Failed to record activity:', activityError)
  // Don't fail the flow if points recording fails
}
```

## Activity Type

- **Activity**: `TICKET_PURCHASED`
- **Display Name**: "Ticket Purchased"
- **Emoji**: 🛒
- **Points**: Configured in backend API

## User Experience

When a user purchases a ticket:

1. ✅ Ticket is minted and transferred to user
2. ✅ Payment is sent to event organizer
3. ✅ Transaction success message shown
4. ✅ Points are automatically awarded
5. ✅ Bonus toast: "+X points earned!"
6. ✅ User level may increase

## Example Flow

```
User clicks "Buy Ticket"
  ↓
buy_event_ticket() executes
  ↓
✅ Transaction succeeds
  ↓
recordActivity('TICKET_PURCHASED', ...)
  ↓
✅ Backend records activity + awards points
  ↓
Toast: "Ticket purchased successfully!"
Toast: "+50 points earned!" 🎉
```

## Error Handling

- If points recording fails, the ticket purchase is **NOT** rolled back
- Points are a bonus feature - ticket purchase is the primary goal
- Errors are logged but don't affect the user flow
- User still gets their ticket even if points fail

## Backend Integration

The points system is managed by the Level API:
- Endpoint: `/api/activities`
- Method: `POST`
- Body:
  ```json
  {
    "walletAddress": "...",
    "activityType": "TICKET_PURCHASED",
    "transactionSignature": "...",
    "metadata": {
      "eventName": "Concert XYZ"
    }
  }
  ```

## Complete Activity Types

The system tracks multiple activities:

| Activity | Points | Description |
|----------|--------|-------------|
| `EVENT_CREATED` | TBD | Create a new event |
| `TICKET_MINTED` | TBD | Mint a ticket (organizers) |
| `TICKET_PURCHASED` | TBD | Buy a ticket (users) ⭐ NEW |
| `TICKET_SCANNED` | TBD | Ticket scanned at event |
| `TICKET_COLLECTIBLE` | TBD | Upgrade to collectible |

## Benefits

✅ **Gamification**: Rewards users for participating
✅ **Engagement**: Encourages more ticket purchases
✅ **Progress**: Helps users level up
✅ **Non-Blocking**: Doesn't interfere with core functionality
✅ **Transparent**: Users see points earned immediately

## Testing

1. Connect wallet
2. Navigate to Events page
3. Click "Buy Ticket" on any event
4. Confirm transaction
5. Observe toasts:
   - "Ticket purchased successfully!"
   - "+X points earned!"
6. Check profile to see updated points total

## Notes

- Points are awarded **after** successful on-chain transaction
- Points are tied to the transaction signature (prevents duplicates)
- Users can view their activity history in their profile
- Points accumulate across all activities
- Leveling system is managed by backend API
