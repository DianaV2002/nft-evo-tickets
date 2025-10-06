# Level System Troubleshooting Guide

## "Transaction already processed" Errors

### Why This Happens

You're seeing these errors because the scanner is detecting transactions that have **already been added to the database**. This is actually **normal behavior** and shows the duplicate prevention is working!

### Common Causes

1. **First Scan** - When you first start the scanner, it processes recent transactions that might already be in the database
2. **Scanner Restart** - If the scanner state is lost, it will try to re-process old transactions
3. **Manual Testing** - If you manually added activities with the same transaction signatures

### ✅ What I Fixed

I've made the following improvements to handle this gracefully:

1. **Silent Duplicate Skipping** - Duplicate transactions are now skipped silently without error logs
2. **Better Filtering** - Scanner now properly tracks which transactions it has already processed
3. **Improved Logging** - You'll see helpful messages about what's being processed

### After the Fix

You should now see logs like this:

```
[Scanner] Starting scan...
[Scanner] Filtering: Found last scanned at index 5, processing 5 new transactions
[Scanner] Found 5 new transactions to process
[Scanner] Ticket minted by 8xB7... (+100 pts)
[Scanner] Event created by 5yA3... (+300 pts)
[Scanner] Scan completed
```

Instead of:
```
Error adding activity: Error: Transaction already processed  ❌
Error adding activity: Error: Transaction already processed  ❌
Error adding activity: Error: Transaction already processed  ❌
```

## Solutions

### Option 1: Just Restart the Server (Recommended)

The fixes I made will handle duplicates automatically:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run level-system:dev
```

### Option 2: Reset Scanner State

If you want the scanner to start fresh from the latest transactions:

```bash
npm run level-system:reset
```

Then restart the server:
```bash
npm run level-system:dev
```

This will:
- ✅ Clear the "last scanned" signature
- ✅ Make the scanner start from recent transactions
- ✅ Duplicates will be automatically skipped

### Option 3: Clean Database (Nuclear Option)

If you want to completely start over with fresh data:

```bash
# Stop the server first
# Delete the database
rm backend/level-system/database/level-system.db*

# Restart (will recreate everything)
npm run level-system:dev
```

**Warning**: This deletes all user points and activities!

## Other Common Issues

### 429 Rate Limit Errors

**Error**: `Server responded with 429 Too Many Requests`

**Solution**: Use Alchemy RPC (see [ALCHEMY_RPC_SETUP.md](ALCHEMY_RPC_SETUP.md))

```env
RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Scanner Not Finding Transactions

**Symptoms**: Scanner runs but never finds any transactions

**Solutions**:

1. **Check Program ID** - Make sure it matches your deployed program:
   ```bash
   # In .env
   PROGRAM_ID=G7gJtKKLntuJpZjzAxPtEurJEgLCFnYA7XzfZuwogSvr
   ```

2. **Check Cluster** - Make sure you're on the right network:
   ```bash
   # In .env
   SOLANA_CLUSTER=devnet
   RPC_URL=https://solana-devnet.g.alchemy.com/v2/...
   ```

3. **Verify Transactions Exist** - Check on Solana Explorer:
   ```
   https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet
   ```

### Database Locked Error

**Error**: `database is locked`

**Cause**: Multiple scanner instances running

**Solution**:
```bash
# Find and kill all node processes
pkill -f "level-system"

# Then restart
npm run level-system:dev
```

### Points Not Showing in Frontend

**Symptoms**: Backend has points but frontend shows 0

**Solutions**:

1. **Check API URL** - Verify frontend .env:
   ```env
   VITE_LEVEL_API_URL=http://localhost:3001
   ```

2. **Check CORS** - Backend .env should allow frontend origin:
   ```env
   ALLOWED_ORIGINS=http://localhost:5173
   ```

3. **Restart Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Check Browser Console** - Look for network errors in DevTools

### Scanner Not Running Automatically

**Symptoms**: Server starts but scanner doesn't run

**Solution**: Check the server logs for initialization:

Expected logs:
```
Initializing database...
Database initialized successfully
Initializing blockchain scanner...
Blockchain scanner initialized
Scanner: Running every 10 minutes
```

If you don't see these, check for errors in the startup sequence.

## Debugging Commands

### Check Database Content

```bash
sqlite3 backend/level-system/database/level-system.db

# View users
SELECT * FROM users;

# View recent activities
SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;

# View scanner state
SELECT * FROM scanner_state;

# Exit
.exit
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Get levels
curl http://localhost:3001/api/levels

# Get user (replace with your wallet)
curl http://localhost:3001/api/user/YOUR_WALLET_ADDRESS

# Get activities
curl http://localhost:3001/api/user/YOUR_WALLET_ADDRESS/activities
```

### Manual Activity Addition

```bash
# Add test activity
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET",
    "activityType": "TICKET_MINTED"
  }'
```

## Logs Explained

### Good Logs ✅

```
[Scanner] Starting scan...
[Scanner] Filtering: Found last scanned at index 3, processing 3 new transactions
[Scanner] Found 3 new transactions to process
[Scanner] Ticket minted by AbC1... (+100 pts)
[Scanner] Scan completed
```

### Warning Logs ⚠️

```
[Scanner] Warning: Last scanned signature not found in recent transactions. Processing all.
```
**Meaning**: Scanner hasn't run in a while, or this is the first scan. Will process recent transactions (duplicates will be skipped).

### Info Logs ℹ️

```
[Scanner] No new transactions since last scan
```
**Meaning**: Everything is up to date. No new activities detected.

```
[Scanner] First scan - processing all recent transactions
```
**Meaning**: Scanner is running for the first time.

## Getting Help

If you're still having issues:

1. **Check Server Logs** - Look for error messages
2. **Check Database** - Use sqlite3 to inspect data
3. **Test Endpoints** - Use curl to verify API responses
4. **Check Configuration** - Verify .env files
5. **Review Documentation**:
   - [LEVEL_SYSTEM_SETUP.md](LEVEL_SYSTEM_SETUP.md) - Setup guide
   - [TESTING_LEVEL_SYSTEM.md](TESTING_LEVEL_SYSTEM.md) - Testing guide
   - [ALCHEMY_RPC_SETUP.md](ALCHEMY_RPC_SETUP.md) - RPC setup

## Quick Reference

| Problem | Command |
|---------|---------|
| Restart scanner | `npm run level-system:dev` |
| Reset scanner state | `npm run level-system:reset` |
| Test API | `npm run level-system:test YOUR_WALLET` |
| Delete all data | `rm backend/level-system/database/*.db*` |
| View database | `sqlite3 backend/level-system/database/level-system.db` |
| Check logs | Look at terminal where server is running |

## Prevention Tips

- ✅ **Use Alchemy RPC** to avoid rate limits
- ✅ **Don't run multiple scanners** - causes database locks
- ✅ **Let duplicates be skipped** - it's normal behavior
- ✅ **Check logs regularly** - catch issues early
- ✅ **Backup database** - especially before major changes
