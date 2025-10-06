import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { param, body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/db';
import {
  getOrCreateUser,
  getUserActivities,
  getLeaderboard,
  getAllLevels,
  addActivity,
} from './services/levelService';
import { verifyWalletSignature, AUTH_MESSAGE } from './services/authService';
import { BlockchainScanner } from './services/blockchainScanner';

dotenv.config();

const app = express();
const PORT = process.env.LEVEL_PORT || 3001;
const CLUSTER = (process.env.SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const PROGRAM_ID = process.env.PROGRAM_ID || '2epW2RyDJZwUe3AahRSuKB2usqPzqm1qckPP7KPkLg3c';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '10kb' }));

// Error handling middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
  }
  next();
};

// Optional: Middleware to verify wallet signature (for protected routes)
const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7);
  const [walletAddress, signature] = token.split(':');

  if (!walletAddress || !signature) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token format. Expected: walletAddress:signature'
    });
  }

  const isValid = verifyWalletSignature(walletAddress, signature);

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid signature'
    });
  }

  // Attach wallet address to request for use in route handlers
  (req as any).walletAddress = walletAddress;
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'level-system',
    cluster: CLUSTER,
    timestamp: new Date().toISOString()
  });
});

// Get authentication message (for frontend to show user what to sign)
app.get('/api/auth/message', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: AUTH_MESSAGE
  });
});

// Get all levels definition
app.get('/api/levels', (req: Request, res: Response) => {
  const levels = getAllLevels();

  res.json({
    success: true,
    data: levels
  });
});

// Get user level and points
app.get(
  '/api/user/:walletAddress',
  [
    param('walletAddress')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid wallet address format'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    const userLevel = getOrCreateUser(walletAddress);

    res.json({
      success: true,
      data: userLevel
    });
  })
);

// Get user activities
app.get(
  '/api/user/:walletAddress/activities',
  [
    param('walletAddress')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid wallet address format'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const activities = getUserActivities(walletAddress, limit);

    res.json({
      success: true,
      data: {
        walletAddress,
        count: activities.length,
        activities
      }
    });
  })
);

// Get leaderboard
app.get('/api/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  const leaderboard = getLeaderboard(limit);

  res.json({
    success: true,
    data: {
      count: leaderboard.length,
      leaderboard
    }
  });
}));

// Manual activity addition (protected endpoint - for testing or manual adjustments)
app.post(
  '/api/activity',
  [
    body('walletAddress')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Invalid wallet address format'),
    body('activityType')
      .isString()
      .isIn(['TICKET_MINTED', 'TICKET_PURCHASED', 'TICKET_SCANNED', 'TICKET_COLLECTIBLE', 'EVENT_CREATED'])
      .withMessage('Invalid activity type'),
    body('transactionSignature')
      .optional()
      .isString()
      .withMessage('Transaction signature must be a string'),
    handleValidationErrors
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, activityType, transactionSignature, metadata } = req.body;

    const result = addActivity(walletAddress, activityType, transactionSignature, metadata);

    if (result.success) {
      res.json({
        success: true,
        data: {
          pointsEarned: result.pointsEarned,
          newTotal: result.newTotal
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to add activity (possibly duplicate transaction)'
      });
    }
  })
);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize and start server
async function start() {
  try {
    // Initialize database
    console.log('Initializing database...');
    initializeDatabase();

    // Initialize blockchain scanner
    console.log('Initializing blockchain scanner...');
    const scanner = new BlockchainScanner(CLUSTER, PROGRAM_ID, process.env.RPC_URL);
    await scanner.initialize();

    // Start periodic scanning (every 10 minutes to avoid rate limits)
    scanner.startPeriodicScan(10);

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Level System API running on port ${PORT}`);
      console.log(`Cluster: ${CLUSTER}`);
      console.log(`Program ID: ${PROGRAM_ID}`);
      console.log(`Security: Helmet, CORS, Rate Limiting enabled`);
      console.log(`Scanner: Running every 10 minutes\n`);
      console.log(`Endpoints:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /api/auth/message`);
      console.log(`   GET  /api/levels`);
      console.log(`   GET  /api/user/:walletAddress`);
      console.log(`   GET  /api/user/:walletAddress/activities`);
      console.log(`   GET  /api/leaderboard`);
      console.log(`   POST /api/activity (manual)\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
