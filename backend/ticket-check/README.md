# NFT Ticket Status API

A secure REST API for checking NFT ticket status on Solana.

## 🔒 Security Features

- **Helmet.js** - Security headers protection
- **CORS** - Cross-Origin Resource Sharing control
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - All inputs sanitized and validated
- **Error Handling** - Safe error messages in production
- **Request Size Limiting** - Max 10kb body size

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start Server

```bash
# Development (with auto-reload)
npm run ticket-check

# Production
npm run api
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "cluster": "devnet",
  "timestamp": "2025-10-03T12:00:00.000Z"
}
```

---

### Get Ticket Status
```
GET /api/ticket/:publicKey
```

**Parameters:**
- `publicKey` - Ticket account public key (base58, 32-44 chars)

**Example:**
```bash
curl http://localhost:3000/api/ticket/DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ",
    "owner": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV",
    "event": "FJCLNUSUhMMWy9Pycc5zQE6hPCwzJCQ6zw73LrZqKrZV",
    "nftMint": "A7NkXk7Ko4fpMe8AqMxCW38N3nDfVAZTTLtq83zP86NY",
    "seat": "B2",
    "stage": "QR",
    "isListed": true,
    "listing": {
      "pda": "ChMCyJ9XSmybT3MFRrdWrsP7PMAQQMMYihz82k9f62vC",
      "seller": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV",
      "priceSol": 1,
      "priceLamports": "1000000000",
      "createdAt": "2025-10-02T22:59:46.000Z",
      "expiresAt": "2025-10-03T22:59:49.000Z",
      "isExpired": false
    },
    "eventDetails": {
      "publicKey": "FJCLNUSUhMMWy9Pycc5zQE6hPCwzJCQ6zw73LrZqKrZV",
      "name": "Concert 2025",
      "eventId": "0",
      "startTime": "2025-10-15T18:00:00.000Z",
      "endTime": "2025-10-15T23:00:00.000Z",
      "authority": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV"
    },
    "solscan": {
      "ticket": "https://solscan.io/account/DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ?cluster=devnet",
      "owner": "https://solscan.io/account/HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV?cluster=devnet",
      "nftMint": "https://solscan.io/account/A7NkXk7Ko4fpMe8AqMxCW38N3nDfVAZTTLtq83zP86NY?cluster=devnet"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Ticket not found"
}
```

---

### Get Owner's Tickets
```
GET /api/owner/:publicKey/tickets
```

**Parameters:**
- `publicKey` - Owner wallet public key

**Example:**
```bash
curl http://localhost:3000/api/owner/HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV/tickets
```

**Response:**
```json
{
  "success": true,
  "data": {
    "owner": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV",
    "count": 3,
    "tickets": [
      {
        "publicKey": "DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ",
        "seat": "B2",
        "stage": "QR",
        "isListed": true,
        "nftMint": "A7NkXk7Ko4fpMe8AqMxCW38N3nDfVAZTTLtq83zP86NY",
        "event": "FJCLNUSUhMMWy9Pycc5zQE6hPCwzJCQ6zw73LrZqKrZV"
      }
    ]
  }
}
```

---

### Get Event's Tickets
```
GET /api/event/:publicKey/tickets
```

**Parameters:**
- `publicKey` - Event account public key

**Example:**
```bash
curl http://localhost:3000/api/event/FJCLNUSUhMMWy9Pycc5zQE6hPCwzJCQ6zw73LrZqKrZV/tickets
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": "FJCLNUSUhMMWy9Pycc5zQE6hPCwzJCQ6zw73LrZqKrZV",
    "count": 5,
    "tickets": [
      {
        "publicKey": "DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ",
        "owner": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV",
        "seat": "B2",
        "stage": "QR",
        "isListed": true,
        "nftMint": "A7NkXk7Ko4fpMe8AqMxCW38N3nDfVAZTTLtq83zP86NY"
      }
    ]
  }
}
```

---

### Get All Listings
```
GET /api/listings
```

**Example:**
```bash
curl http://localhost:3000/api/listings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 1,
    "listings": [
      {
        "pda": "ChMCyJ9XSmybT3MFRrdWrsP7PMAQQMMYihz82k9f62vC",
        "ticket": "DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ",
        "seller": "HvRCkFt42tRSUd7YrowtcN4hnMM2eRmMZHMM2aDJBDWV",
        "priceSol": 1,
        "priceLamports": "1000000000",
        "createdAt": "2025-10-02T22:59:46.000Z",
        "expiresAt": "2025-10-03T22:59:49.000Z",
        "isExpired": false,
        "isActive": true
      }
    ]
  }
}
```

---

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `SOLANA_CLUSTER` | Solana cluster | `devnet` |
| `PROGRAM_ID` | NFT program ID | See .env.example |
| `RPC_URL` | Custom RPC endpoint | Public devnet RPC |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |

## 🛡️ Security Best Practices

### Production Deployment

1. **Set specific CORS origins:**
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **Use custom RPC endpoint:**
   ```env
   RPC_URL=https://your-private-rpc.com
   ```

3. **Enable production mode:**
   ```env
   NODE_ENV=production
   ```

4. **Use HTTPS/TLS:**
   - Deploy behind nginx/cloudflare
   - Force HTTPS redirects

5. **Monitor rate limits:**
   - Adjust limits based on traffic
   - Consider API keys for authenticated users

### Rate Limiting

Default: 100 requests per 15 minutes per IP

To customize, edit `api/server.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

## 🧪 Testing

### Using cURL
```bash
# Health check
curl http://localhost:3000/health

# Get ticket
curl http://localhost:3000/api/ticket/DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ

# Get listings
curl http://localhost:3000/api/listings
```

### Using JavaScript/TypeScript
```typescript
// Get ticket status
const response = await fetch(
  'http://localhost:3000/api/ticket/DkY5N552GGN2myopxzfVFgvST52LY79JixKoo9i975xZ'
);
const data = await response.json();
console.log(data);
```

## 📊 Error Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid input |
| `404` | Not Found - Ticket/account doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

## 🚨 Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "errors": [
    {
      "field": "publicKey",
      "message": "Invalid public key format"
    }
  ]
}
```

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Prices are returned in both SOL and lamports
- Solscan links automatically adjust for cluster (devnet/mainnet)
- Public keys are validated (32-44 characters, base58)
- Body size limited to 10kb for security
