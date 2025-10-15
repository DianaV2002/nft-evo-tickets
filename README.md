<div align="center">

<img src="./frontend/src/assets/logo.png" alt="NFT Evo Tickets Logo" width="200"/>

# 🌿 NFT Evo Tickets

> A decentralized wellness retreat ticketing platform — fully on-chain, eco-friendly, and built for mindful experiences.

[![Pitch Deck](https://img.shields.io/badge/📊_Pitch_Deck-View_Presentation-FF6B6B?style=for-the-badge)](https://www.canva.com/design/DAG1MwQ_yz4/XBf79nYdN4_fbhyXQ_ZFlA/edit)

</div>

![Solana](https://img.shields.io/badge/Solana-14F195?style=for-the-badge&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-6F4FF2?style=for-the-badge&logo=anchor&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)

---

## 🌱 Overview

**NFT Evo Tickets** is a blockchain-based ticketing system designed specifically for wellness retreats, yoga experiences, and eco-friendly events. Built on Solana, it combines the security of NFT ownership with a gamified journey that encourages mindful participation and environmental consciousness.

Traditional paper tickets harm the environment. Digital platforms lack ownership and transferability. NFT Evo Tickets solves both problems by creating verifiable, transferable, and sustainable event tickets that evolve with the attendee's journey.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Solana | High-speed, low-cost transactions |
| **Smart Contracts** | Anchor (Rust) | Type-safe on-chain programs |
| **NFT Standard** | Metaplex Token Metadata | Industry-standard NFT creation |
| **Frontend** | React + TypeScript | Modern, type-safe UI |
| **UI Framework** | Vite + Tailwind CSS | Fast builds, beautiful design |
| **Wallet Integration** | Solana Wallet Adapter | Multi-wallet support |
| **Backend** | Node.js + Express | Points/level API server |
| **Database** | SQLite (Better-SQLite3) | Persistent user data |
| **State Management** | React Hooks | Efficient local state |
| **Build Tool** | Anchor CLI | Smart contract compilation |
| **Package Manager** | npm / yarn | Dependency management |

---

## 🔗 Powered by Solana

### Why Solana?

**Speed** - Solana's 400ms block times mean ticket purchases complete in seconds, not minutes.

**Cost** - Transaction fees are ~$0.00025, making micro-transactions viable for event ticketing.

**Scalability** - Handles 65,000+ TPS, ensuring smooth experience even during high-demand ticket drops.

**Environmental Efficiency** - Solana's Proof-of-History is significantly more energy-efficient than Proof-of-Work chains.

### Smart Contract Architecture

## 🚀 Getting Started

### Prerequisites

```bash
# Required installations
- Rust 1.70+
- Solana CLI 1.18+
- Anchor 0.30+
- Node.js 18+
- npm or yarn
```

### Installation

```bash
# Clone the repository
git clone https://github.com/DianaV2002/nft-evo-tickets.git
cd nft-evo-tickets

# Install dependencies
npm install
cd frontend && npm install

# Build the Solana program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Start the backend server
npm start
```

---

## ⚙️ Environment Configuration

Create `.env` files in the appropriate directories. Example files are provided as `.env.example`.

### 📁 Root Directory - `.env`

Configuration for the main server and level system backend.

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Solana Configuration
SOLANA_CLUSTER=devnet
PROGRAM_ID=your_program_id_here
RPC_URL=https://api.devnet.solana.com

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Level System Configuration
LEVEL_PORT=3001
LEVEL_DB_PATH=./backend/level-system/database/level-system.db
```

**Variables Explained:**

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Main application server port | ✅ Yes |
| `NODE_ENV` | Environment mode (development/production) | ✅ Yes |
| `SOLANA_CLUSTER` | Solana network (devnet/mainnet-beta) | ✅ Yes |
| `PROGRAM_ID` | Your deployed Anchor program address | ✅ Yes |
| `RPC_URL` | Solana RPC endpoint URL | ✅ Yes |
| `ALLOWED_ORIGINS` | CORS whitelist for API access | ⚠️ Production only |
| `LEVEL_PORT` | Port for level system API server | ✅ Yes |
| `LEVEL_DB_PATH` | SQLite database file path | ✅ Yes |

---

### 🎨 Frontend Directory - `frontend/.env`

Configuration for the React frontend application (Vite).

```env
# Level System API URL
VITE_LEVEL_API_URL=http://localhost:3001

# Solana Network Configuration
VITE_SOLANA_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com

# Program ID
VITE_PROGRAM_ID=your_program_id_here
```

**Variables Explained:**

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_LEVEL_API_URL` | Backend API endpoint for level/points system | ✅ Yes |
| `VITE_SOLANA_NETWORK` | Solana network name (devnet/mainnet-beta) | ✅ Yes |
| `VITE_RPC_URL` | Solana RPC endpoint URL | ✅ Yes |
| `VITE_PROGRAM_ID` | Your deployed program address | ✅ Yes |

> **Note:** All frontend environment variables must be prefixed with `VITE_` to be accessible in the Vite build.

---

**🔑 Getting Resources:**

- **Custom RPC Endpoints**: For better rate limits and performance, consider [QuickNode](https://quicknode.com) or [Helius](https://helius.dev)
- **Solana Devnet**: Free to use at `https://api.devnet.solana.com`
- **Program ID**: Obtain after running `anchor deploy`

---

## 🧪 Testing

```bash
# Run Anchor tests
anchor test

# Run frontend tests
cd frontend && npm test

