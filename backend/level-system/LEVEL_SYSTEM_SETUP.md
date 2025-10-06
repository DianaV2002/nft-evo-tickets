# Level System Quick Start Guide

This guide will help you set up and run the gamification level system for NFT Evo Tickets.

## Prerequisites

- Node.js installed
- Project dependencies installed (`npm install`)
- Solana program deployed (or using devnet)

## Step 1: Install Dependencies

From the project root:

```bash
npm install
```

This will install:
- `better-sqlite3` - SQLite database
- `tweetnacl` - Wallet signature verification
- Other required dependencies

## Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and ensure these values are set:

```env
# Required
SOLANA_CLUSTER=devnet
PROGRAM_ID=your_deployed_program_id
RPC_URL=https://api.devnet.solana.com

# Level System
LEVEL_PORT=3001
LEVEL_DB_PATH=./backend/level-system/database/level-system.db

# Security
ALLOWED_ORIGINS=http://localhost:5173
```

## Step 3: Configure Frontend

In the `frontend/` directory:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_LEVEL_API_URL=http://localhost:3001
VITE_PROGRAM_ID=your_deployed_program_id
```

## Step 4: Run the Level System Backend

From the project root:

```bash
# Development mode (auto-reload)
npm run level-system:dev

# Or production mode
npm run level-system
```

You should see:
```
🚀 Level System API running on port 3001
Cluster: devnet
Program ID: your_program_id
Scanner: Running every 5 minutes
```

## Step 5: Run the Frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

## Step 6: Update Rewards Page (Optional)

Replace the old Rewards page with the new one:

```bash
# From project root
mv frontend/src/pages/RewardsNew.tsx frontend/src/pages/Rewards.tsx
```

Or manually update your routing to use `RewardsNew`.

## Testing the System

### 1. Check API Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "level-system",
  "cluster": "devnet",
  "timestamp": "..."
}
```

### 2. View Levels

```bash
curl http://localhost:3001/api/levels
```

### 3. Check User Level

Replace `WALLET_ADDRESS` with your Solana wallet address:

```bash
curl http://localhost:3001/api/user/WALLET_ADDRESS
```

### 4. Add Test Activity (Manual)

```bash
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "activityType": "TICKET_MINTED",
    "transactionSignature": "test_123"
  }'
```

### 5. View in Frontend

1. Connect your wallet in the frontend
2. Navigate to the Rewards page
3. You should see your level, points, and activities

## How Points Are Earned

The system automatically scans the blockchain every 5 minutes and awards points for:

| Activity | Points |
|----------|--------|
| Minting a ticket | 100 pts |
| Purchasing a ticket | 150 pts |
| Attending an event (scanning ticket) | 200 pts |
| Upgrading to collectible | 50 pts |
| Creating an event | 300 pts |

## Viewing the Database

To inspect the SQLite database:

```bash
sqlite3 backend/level-system/database/level-system.db

# Inside sqlite3:
SELECT * FROM users ORDER BY total_points DESC;
SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;
.exit
```

## Troubleshooting

### Database doesn't exist
- The database is created automatically on first run
- Check that `LEVEL_DB_PATH` directory exists or will be created
- Ensure write permissions

### Scanner not finding transactions
- Verify `PROGRAM_ID` matches your deployed program
- Check that you're using the correct Solana cluster
- Ensure RPC endpoint is accessible

### Frontend can't connect to API
- Check that backend is running on port 3001
- Verify `VITE_LEVEL_API_URL` in frontend/.env
- Check CORS settings in backend

### Points not updating
- Scanner runs every 5 minutes - wait for next scan
- Check backend logs for errors
- Verify transactions are successful on Solana blockchain

## Running in Production

1. Set environment variables:
   ```env
   NODE_ENV=production
   SOLANA_CLUSTER=mainnet-beta
   PROGRAM_ID=your_mainnet_program_id
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. Use a production RPC endpoint (not public Solana endpoints)

3. Run with process manager (PM2, systemd, etc.):
   ```bash
   pm2 start npm --name "level-system" -- run level-system
   ```

4. Set up database backups:
   ```bash
   # Example: Daily backup
   0 0 * * * cp /path/to/level-system.db /backups/level-system-$(date +\%Y\%m\%d).db
   ```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Displays levels, points, activities                  │
│  - Calls Level System API                               │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│              Level System Backend (Express)              │
│  - REST API for level data                              │
│  - Wallet signature authentication                      │
│  - Blockchain scanner (every 5 min)                     │
└─────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌──────────────────┐              ┌──────────────────────┐
│  SQLite Database │              │  Solana Blockchain   │
│  - Users         │              │  - Program Txs       │
│  - Activities    │              │  - Event Data        │
└──────────────────┘              └──────────────────────┘
```

## Next Steps

- Monitor the scanner logs to see activities being detected
- Perform on-chain activities (mint tickets, attend events, etc.)
- Watch your points and level increase automatically
- Check the leaderboard to see rankings

## Support

For issues or questions:
- Check the [Level System README](backend/level-system/README.md)
- Review backend logs for errors
- Ensure all environment variables are correctly set

Happy leveling! 🌱🌿🌸🌳🍃
