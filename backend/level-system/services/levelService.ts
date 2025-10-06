import { getDatabase } from '../database/db';

export interface Level {
  name: string;
  emoji: string;
  minPoints: number;
  maxPoints: number | null;
}

export const LEVELS: Level[] = [
  { name: 'Seed Planter', emoji: '🌱', minPoints: 0, maxPoints: 499 },
  { name: 'Root Grower', emoji: '🌿', minPoints: 500, maxPoints: 999 },
  { name: 'Bloom Tender', emoji: '🌸', minPoints: 1000, maxPoints: 1999 },
  { name: 'Forest Guardian', emoji: '🌳', minPoints: 2000, maxPoints: 4999 },
  { name: 'Nature Sage', emoji: '🍃', minPoints: 5000, maxPoints: null }
];

export interface UserLevel {
  walletAddress: string;
  totalPoints: number;
  currentLevel: string;
  currentLevelData: Level;
  nextLevelData: Level | null;
  progressToNext: number;
}

export interface Activity {
  id: number;
  walletAddress: string;
  activityType: string;
  pointsEarned: number;
  transactionSignature: string | null;
  metadata: any;
  createdAt: string;
}

/**
 * Get level based on points
 */
export function getLevelFromPoints(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/**
 * Get next level
 */
export function getNextLevel(currentLevel: Level): Level | null {
  const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
  if (currentIndex === -1 || currentIndex === LEVELS.length - 1) {
    return null;
  }
  return LEVELS[currentIndex + 1];
}

/**
 * Calculate progress to next level (0-100)
 */
export function calculateProgress(points: number, currentLevel: Level, nextLevel: Level | null): number {
  if (!nextLevel) return 100;

  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;

  return Math.min(100, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
}

/**
 * Get or create user in database
 */
export function getOrCreateUser(walletAddress: string): UserLevel {
  const db = getDatabase();

  // Try to get existing user
  let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(walletAddress) as any;

  if (!user) {
    // Create new user
    db.prepare(`
      INSERT INTO users (wallet_address, total_points, current_level)
      VALUES (?, 0, ?)
    `).run(walletAddress, `${LEVELS[0].emoji} ${LEVELS[0].name}`);

    user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(walletAddress) as any;
  }

  const currentLevelData = getLevelFromPoints(user.total_points);
  const nextLevelData = getNextLevel(currentLevelData);
  const progressToNext = calculateProgress(user.total_points, currentLevelData, nextLevelData);

  return {
    walletAddress: user.wallet_address,
    totalPoints: user.total_points,
    currentLevel: user.current_level,
    currentLevelData,
    nextLevelData,
    progressToNext
  };
}

/**
 * Add activity and update user points
 */
export function addActivity(
  walletAddress: string,
  activityTypeName: string,
  transactionSignature?: string,
  metadata?: any
): { success: boolean; pointsEarned: number; newTotal: number } {
  const db = getDatabase();

  try {
    // Start transaction
    const transaction = db.transaction(() => {
      // Get activity type
      const activityType = db.prepare('SELECT * FROM activity_types WHERE name = ?').get(activityTypeName) as any;

      if (!activityType) {
        throw new Error(`Activity type ${activityTypeName} not found`);
      }

      // Check if transaction already processed (prevent duplicates)
      // Only check if a signature is provided (allows testing without signatures)
      if (transactionSignature && transactionSignature.trim() !== '') {
        const existing = db.prepare('SELECT id FROM activities WHERE transaction_signature = ?').get(transactionSignature);
        if (existing) {
          throw new Error('Transaction already processed');
        }
      }

      // Get or create user
      getOrCreateUser(walletAddress);

      // Add activity
      db.prepare(`
        INSERT INTO activities (wallet_address, activity_type_id, points_earned, transaction_signature, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        walletAddress,
        activityType.id,
        activityType.points,
        transactionSignature || null,
        metadata ? JSON.stringify(metadata) : null
      );

      // Update user points
      db.prepare(`
        UPDATE users
        SET total_points = total_points + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = ?
      `).run(activityType.points, walletAddress);

      // Get new total
      const user = db.prepare('SELECT total_points FROM users WHERE wallet_address = ?').get(walletAddress) as any;

      // Update user level if needed
      const newLevel = getLevelFromPoints(user.total_points);
      db.prepare(`
        UPDATE users
        SET current_level = ?
        WHERE wallet_address = ?
      `).run(`${newLevel.emoji} ${newLevel.name}`, walletAddress);

      return { pointsEarned: activityType.points, newTotal: user.total_points };
    });

    const result = transaction();

    return {
      success: true,
      pointsEarned: result.pointsEarned,
      newTotal: result.newTotal
    };
  } catch (error: any) {
    // Don't log duplicate transaction errors - they're expected
    if (!error?.message?.includes('Transaction already processed')) {
      console.error('Error adding activity:', error);
    }
    return {
      success: false,
      pointsEarned: 0,
      newTotal: 0
    };
  }
}

/**
 * Get user activities
 */
export function getUserActivities(walletAddress: string, limit = 50): Activity[] {
  const db = getDatabase();

  const activities = db.prepare(`
    SELECT
      a.id,
      a.wallet_address,
      at.name as activity_type,
      a.points_earned,
      a.transaction_signature,
      a.metadata,
      a.created_at
    FROM activities a
    JOIN activity_types at ON a.activity_type_id = at.id
    WHERE a.wallet_address = ?
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(walletAddress, limit) as any[];

  return activities.map(a => ({
    id: a.id,
    walletAddress: a.wallet_address,
    activityType: a.activity_type,
    pointsEarned: a.points_earned,
    transactionSignature: a.transaction_signature,
    metadata: a.metadata ? JSON.parse(a.metadata) : null,
    createdAt: a.created_at
  }));
}

/**
 * Get leaderboard
 */
export function getLeaderboard(limit = 100): UserLevel[] {
  const db = getDatabase();

  const users = db.prepare(`
    SELECT * FROM users
    ORDER BY total_points DESC
    LIMIT ?
  `).all(limit) as any[];

  return users.map(user => {
    const currentLevelData = getLevelFromPoints(user.total_points);
    const nextLevelData = getNextLevel(currentLevelData);
    const progressToNext = calculateProgress(user.total_points, currentLevelData, nextLevelData);

    return {
      walletAddress: user.wallet_address,
      totalPoints: user.total_points,
      currentLevel: user.current_level,
      currentLevelData,
      nextLevelData,
      progressToNext
    };
  });
}

/**
 * Get all levels definition
 */
export function getAllLevels(): Level[] {
  return LEVELS;
}
