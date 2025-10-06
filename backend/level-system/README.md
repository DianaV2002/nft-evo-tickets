# NFT Evo Tickets - Level System

A gamification layer for the NFT Evo Tickets platform that rewards users with points and levels based on their blockchain activity.

## Features

- **Automatic Activity Tracking**: Periodically scans the Solana blockchain for ticket and event activities
- **Points System**: Users earn points for various activities (minting tickets, attending events, creating events, etc.)
- **Level Progression**: 5 levels from Seed Planter to Nature Sage
- **SQLite Database**: Lightweight, separate database for level data
- **Wallet Authentication**: Simple and secure authentication using wallet signatures
- **REST API**: Easy-to-use API for frontend integration

## Levels

| Level | Emoji | Points Required |
|-------|-------|-----------------|
| Seed Planter | 🌱 | 0 |
| Root Grower | 🌿 | 500 |
| Bloom Tender | 🌸 | 1,000 |
| Forest Guardian | 🌳 | 2,000 |
| Nature Sage | 🍃 | 5,000 |

## Points System

| Activity | Points |
|----------|--------|
| Ticket Minted | 100 pts |
| Ticket Purchased | 150 pts |
| Event Attended (Scanned) | 200 pts |
| Ticket Upgraded to Collectible | 50 pts |
| Event Created | 300 pts |

## Setup

### 1. Install Dependencies

From the project root:

```bash
npm install
```

The level system requires these additional packages:
- `better-sqlite3` - SQLite database
- `tweetnacl` - Signature verification

### 2. Environment Variables

Add to your `.env` file:

```env
# Level System Configuration
LEVEL_PORT=3001
LEVEL_DB_PATH=./backend/level-system/database/level-system.db

# Optional: Override defaults
SOLANA_CLUSTER=devnet
PROGRAM_ID=your_program_id_here
RPC_URL=your_rpc_url_here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Initialize Database

The database will be automatically created when you first run the server. The schema is located in:
```
backend/level-system/database/schema.sql
```

### 4. Run the Level System Server

```bash
# Production mode
npm run level-system

# Development mode (with auto-reload)
npm run level-system:dev
```

The server will:
- Start on port 3001 (or `LEVEL_PORT`)
- Initialize the SQLite database
- Start the blockchain scanner (runs every 5 minutes)

## API Endpoints

### Health Check
```
GET /health
```

### Get Authentication Message
```
GET /api/auth/message
```
Returns the message users should sign with their wallet.

### Get All Levels
```
GET /api/levels
```
Returns the level definitions.

### Get User Level
```
GET /api/user/:walletAddress
```
Returns user's current level, points, and progress.

### Get User Activities
```
GET /api/user/:walletAddress/activities?limit=50
```
Returns user's activity history.

### Get Leaderboard
```
GET /api/leaderboard?limit=100
```
Returns top users by points.

### Manual Activity Addition (Testing)
```
POST /api/activity
Body: {
  "walletAddress": "...",
  "activityType": "TICKET_MINTED",
  "transactionSignature": "...",
  "metadata": {}
}
```

## Frontend Integration

The frontend can use the level service located at:
```
frontend/src/services/levelService.ts
```

Add to your frontend `.env`:
```env
VITE_LEVEL_API_URL=http://localhost:3001
```

Example usage:
```typescript
import { getUserLevel, getUserActivities } from '@/services/levelService';

const userLevel = await getUserLevel(walletAddress);
const activities = await getUserActivities(walletAddress);
```

## How It Works

### Blockchain Scanner

The scanner runs every 5 minutes and:
1. Fetches recent transactions for the program
2. Parses transaction logs to identify instruction types
3. Awards points to users based on activity type
4. Stores activities in the database (prevents duplicates)
5. Updates user levels automatically

### Activity Detection

The scanner detects activities by parsing transaction logs:
- `Instruction: MintTicket` → Ticket Minted (100 pts)
- `Instruction: BuyTicket` → Ticket Purchased (150 pts)
- `Instruction: UpdateTicket` + `scanned` → Event Attended (200 pts)
- `Instruction: UpgradeToCollectible` → Collectible Upgraded (50 pts)
- `Instruction: CreateEvent` → Event Created (300 pts)

### Database Schema

The system uses 4 main tables:
- `users` - Wallet addresses and their total points
- `activity_types` - Definitions of point values
- `activities` - Historical record of all user activities
- `scanner_state` - Tracks last scanned transaction

## Development

### Testing Activity Addition

You can manually add activities for testing:

```bash
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_MINTED",
    "transactionSignature": "test_sig_123"
  }'
```

### Viewing Database

```bash
sqlite3 backend/level-system/database/level-system.db
```

Common queries:
```sql
-- View all users
SELECT * FROM users ORDER BY total_points DESC;

-- View recent activities
SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;

-- View scanner state
SELECT * FROM scanner_state;
```

## Security

- Rate limiting: 100 requests per 15 minutes per IP
- CORS protection
- Helmet security headers
- Wallet signature verification for authentication
- Input validation on all endpoints

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in environment
2. Configure proper CORS origins
3. Use a production-ready RPC endpoint
4. Consider backing up the SQLite database regularly
5. Monitor scanner logs for errors

## Troubleshooting

### Scanner not finding transactions
- Check that `PROGRAM_ID` matches your deployed program
- Verify RPC endpoint is working
- Check scanner logs for errors

### Database locked errors
- Ensure only one instance of the server is running
- Check file permissions on the database file

### Points not updating
- Verify transactions are successful on Solana
- Check scanner logs for processing errors
- Manually verify transaction signatures

## Future Enhancements

- [ ] Add referral tracking
- [ ] Implement achievement badges
- [ ] Add webhook notifications for level ups
- [ ] Create admin dashboard
- [ ] Add analytics and metrics
