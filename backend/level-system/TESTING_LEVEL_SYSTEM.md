# Testing the Level System

## Quick Testing Guide

### Method 1: Without Transaction Signatures (Easy Testing)

You can now add activities **without** providing a transaction signature for testing. This bypasses duplicate checking:

```bash
# Add multiple test activities without signatures
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_MINTED"
  }'

# Add another one - no duplicate error!
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_PURCHASED"
  }'

# Add event attended
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_SCANNED"
  }'
```

### Method 2: With Unique Signatures (More Realistic)

Use unique signatures each time to simulate real blockchain transactions:

```bash
# Test 1
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_MINTED",
    "transactionSignature": "test_mint_001"
  }'

# Test 2 - different signature
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_PURCHASED",
    "transactionSignature": "test_buy_001"
  }'

# Test 3 - duplicate will be rejected (expected behavior)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_MINTED",
    "transactionSignature": "test_mint_001"
  }'
# Expected: "Transaction already processed" error
```

### Method 3: Using the Test Script

The easiest way to test:

```bash
npm run level-system:test YOUR_WALLET_ADDRESS
```

This will:
- ✅ Test health check
- ✅ Get all levels
- ✅ Get leaderboard
- ✅ Get your user level
- ✅ Get your activities
- ✅ Add a test activity (auto-generates unique signature)
- ✅ Verify points were added

## Testing Different Scenarios

### Test 1: Level Up Progression

Add activities to reach each level:

```bash
WALLET="YOUR_WALLET_ADDRESS"

# Get to Root Grower (500 pts)
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/activity \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"TICKET_MINTED\"}"
done

# Check level
curl http://localhost:3001/api/user/$WALLET
```

### Test 2: Different Activity Types

Test all 5 activity types:

```bash
WALLET="YOUR_WALLET_ADDRESS"

# Mint ticket (100 pts)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"TICKET_MINTED\"}"

# Purchase ticket (150 pts)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"TICKET_PURCHASED\"}"

# Attend event (200 pts)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"TICKET_SCANNED\"}"

# Upgrade collectible (50 pts)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"TICKET_COLLECTIBLE\"}"

# Create event (300 pts)
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\", \"activityType\": \"EVENT_CREATED\"}"

# Total: 800 points - should be Root Grower level!
curl http://localhost:3001/api/user/$WALLET | json_pp
```

### Test 3: Multiple Users Leaderboard

Create activities for different wallets to test leaderboard:

```bash
# User 1 - lots of points
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/activity \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\": \"WALLET_1\", \"activityType\": \"TICKET_MINTED\"}"
done

# User 2 - some points
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/activity \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\": \"WALLET_2\", \"activityType\": \"TICKET_MINTED\"}"
done

# User 3 - few points
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"WALLET_3\", \"activityType\": \"TICKET_MINTED\"}"

# Check leaderboard
curl http://localhost:3001/api/leaderboard
```

## Viewing Test Results

### Check User Level
```bash
curl http://localhost:3001/api/user/YOUR_WALLET_ADDRESS | json_pp
```

Expected response:
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "totalPoints": 450,
    "currentLevel": "🌱 Seed Planter",
    "currentLevelData": {
      "name": "Seed Planter",
      "emoji": "🌱",
      "minPoints": 0,
      "maxPoints": 499
    },
    "nextLevelData": {
      "name": "Root Grower",
      "emoji": "🌿",
      "minPoints": 500,
      "maxPoints": 999
    },
    "progressToNext": 90
  }
}
```

### Check Activities
```bash
curl http://localhost:3001/api/user/YOUR_WALLET_ADDRESS/activities | json_pp
```

### Check Leaderboard
```bash
curl http://localhost:3001/api/leaderboard | json_pp
```

## Viewing Database Directly

To see what's in the database:

```bash
sqlite3 backend/level-system/database/level-system.db

# Inside sqlite3:
.mode column
.headers on

# View all users
SELECT wallet_address, total_points, current_level FROM users;

# View recent activities
SELECT wallet_address, activity_type_id, points_earned, created_at
FROM activities
ORDER BY created_at DESC
LIMIT 10;

# Exit
.exit
```

## Resetting Test Data

To start fresh:

```bash
# Stop the server first (Ctrl+C)

# Delete the database
rm backend/level-system/database/level-system.db*

# Restart the server (will recreate the database)
npm run level-system:dev
```

## Common Testing Errors

### ❌ "Transaction already processed"
**Cause**: You're using the same signature twice
**Fix**: Use a different signature or omit it for testing

### ❌ "Invalid activity type"
**Cause**: Typo in activityType
**Fix**: Use exact values:
- `TICKET_MINTED`
- `TICKET_PURCHASED`
- `TICKET_SCANNED`
- `TICKET_COLLECTIBLE`
- `EVENT_CREATED`

### ❌ "Invalid wallet address format"
**Cause**: Wallet address is not 32-44 characters
**Fix**: Use a valid Solana wallet address

### ❌ "Failed to fetch user level"
**Cause**: Server not running or wrong port
**Fix**: Ensure server is running on port 3001

## Testing with Frontend

1. **Start backend**: `npm run level-system:dev`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Connect wallet** in frontend
4. **Navigate to Rewards page**
5. **Manually add points** via API:
   ```bash
   curl -X POST http://localhost:3001/api/activity \
     -H "Content-Type: application/json" \
     -d '{
       "walletAddress": "YOUR_CONNECTED_WALLET",
       "activityType": "EVENT_CREATED"
     }'
   ```
6. **Refresh page** to see updated points!

## Production Testing

For real blockchain testing:

1. Ensure Alchemy RPC is configured
2. Deploy your program to devnet
3. Perform real on-chain activities:
   - Mint a ticket
   - Buy a ticket
   - Scan a ticket
   - Create an event
4. Wait up to 10 minutes for scanner to detect
5. Check points in frontend

Points should automatically appear after the scanner runs!

## Tips

- Use `json_pp` or `jq` to pretty-print JSON responses
- Monitor server logs to see scanner activity
- Check database directly to verify data
- Use browser DevTools Network tab to debug frontend API calls
- Test with multiple wallets to verify leaderboard

Happy testing! 🧪
