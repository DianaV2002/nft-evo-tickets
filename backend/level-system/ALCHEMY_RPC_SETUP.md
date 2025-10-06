# Setting Up Alchemy RPC for Level System

Alchemy provides a much higher rate limit than public Solana RPC endpoints, solving the 429 error.

## Step 1: Create Alchemy Account

1. Go to [https://www.alchemy.com](https://www.alchemy.com)
2. Click "Sign Up" (it's free!)
3. Verify your email

## Step 2: Create a Solana App

1. After logging in, click **"Create App"** or **"+ Create new app"**
2. Fill in the details:
   - **Chain**: Select **Solana**
   - **Network**: Select **Solana Devnet** (or Mainnet if you're ready)
   - **Name**: `nft-evo-tickets-level-system`
   - **Description**: Optional

3. Click **"Create App"**

## Step 3: Get Your RPC URL

1. In your app dashboard, click on your newly created app
2. Click **"View Key"** or **"API Key"**
3. Copy the **HTTPS URL** - it will look like:
   ```
   https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

## Step 4: Update Your .env File

Add or update the RPC_URL in your `.env`:

```env
# Alchemy RPC (MUCH higher rate limits!)
RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY

# Other settings
SOLANA_CLUSTER=devnet
PROGRAM_ID=your_program_id_here
LEVEL_PORT=3001
```

## Step 5: Restart Your Level System

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run level-system:dev
```

You should see in the logs:
```
Initializing blockchain scanner...
Blockchain scanner initialized
```

## Step 6: Verify It Works

The scanner should now work without 429 errors! You'll see logs like:

```
[Scanner] Starting scan...
[Scanner] Found 3 new transactions to process
[Scanner] Ticket minted by 8xB7... (+100 pts)
[Scanner] Event created by 5yA3... (+300 pts)
[Scanner] Scan completed
```

## Alchemy Rate Limits (Free Tier)

With Alchemy's free tier, you get:
- **330 Compute Units per second** (much higher than public RPC!)
- **3.3M monthly compute units**
- No credit card required

This is MORE than enough for the level system scanner.

## Benefits of Using Alchemy

✅ **No more 429 errors** - Much higher rate limits
✅ **Faster responses** - Better infrastructure
✅ **Free tier** - No cost for development
✅ **Reliable** - 99.9% uptime
✅ **Dashboard** - Monitor your API usage

## Troubleshooting

### Still getting 429 errors?

1. **Check your RPC_URL** is correct in `.env`
2. **Restart the server** after changing `.env`
3. **Verify the cluster** matches (devnet vs mainnet)
4. **Check Alchemy dashboard** for usage/errors

### Wrong cluster error?

Make sure both match:
```env
SOLANA_CLUSTER=devnet
RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY
```

Or for mainnet:
```env
SOLANA_CLUSTER=mainnet-beta
RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Alternative: Other RPC Providers

If you prefer not to use Alchemy, other options:

### Helius (Also Excellent)
- Free tier: 100 req/sec
- Sign up: https://helius.dev
- RPC format: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`

### QuickNode
- Free tier available
- Sign up: https://quicknode.com
- Good for mainnet

### GenesysGo (ShadowDrive)
- Community favorite
- Sign up: https://genesysgo.com

All of these will solve the 429 error!

## Summary

1. Create Alchemy account
2. Create Solana app
3. Copy RPC URL
4. Add to `.env` as `RPC_URL`
5. Restart level system
6. Enjoy no more rate limit errors! 🎉

The scanner improvements I made (exponential backoff, delays between transactions) will also help, but **using Alchemy is the best long-term solution**.
