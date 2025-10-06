# Level System - README Section

Add this section to your main README.md:

---

## 🎮 Gamification Level System

The project includes a comprehensive gamification system that rewards users with points and levels based on their on-chain activities.

### Features

- **5 Progression Levels**: From 🌱 Seed Planter to 🍃 Nature Sage
- **Automatic Point Tracking**: Blockchain scanner awards points automatically
- **Real-time Progress**: Live updates in the frontend Rewards page
- **Secure & Simple**: Wallet-based authentication (no passwords)
- **Separate Database**: SQLite database isolated from main application

### Levels

| Level | Icon | Points Required |
|-------|------|-----------------|
| Seed Planter | 🌱 | 0 |
| Root Grower | 🌿 | 500 |
| Bloom Tender | 🌸 | 1,000 |
| Forest Guardian | 🌳 | 2,000 |
| Nature Sage | 🍃 | 5,000 |

### How to Earn Points

| Activity | Points |
|----------|--------|
| Mint a ticket | 100 pts |
| Purchase a ticket | 150 pts |
| Attend an event (scan) | 200 pts |
| Upgrade to collectible | 50 pts |
| Create an event | 300 pts |

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (add to `.env`):
   ```env
   LEVEL_PORT=3001
   LEVEL_DB_PATH=./backend/level-system/database/level-system.db
   ```

3. **Run the level system backend**:
   ```bash
   npm run level-system:dev
   ```

4. **Test the API**:
   ```bash
   npm run level-system:test
   ```

5. **View in frontend**: Navigate to the Rewards page after connecting your wallet

### Documentation

- **Setup Guide**: See [LEVEL_SYSTEM_SETUP.md](LEVEL_SYSTEM_SETUP.md)
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **API Documentation**: See [backend/level-system/README.md](backend/level-system/README.md)

### Architecture

The level system consists of:
- **Backend API** (port 3001): Express server with REST endpoints
- **Blockchain Scanner**: Automatic activity detection every 5 minutes
- **SQLite Database**: Stores users, activities, and points
- **Frontend Service**: React integration for the Rewards page

No blockchain spam - the scanner batches reads every 5 minutes instead of monitoring every transaction.

---
