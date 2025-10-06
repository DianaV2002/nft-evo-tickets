const LEVEL_API_URL = import.meta.env.VITE_LEVEL_API_URL || 'http://localhost:3001';

export interface Level {
  name: string;
  emoji: string;
  minPoints: number;
  maxPoints: number | null;
}

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
 * Get all levels definition
 */
export async function getAllLevels(): Promise<Level[]> {
  const response = await fetch(`${LEVEL_API_URL}/api/levels`);
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch levels');
  }

  return data.data;
}

/**
 * Get user level and points
 */
export async function getUserLevel(walletAddress: string): Promise<UserLevel> {
  const response = await fetch(`${LEVEL_API_URL}/api/user/${walletAddress}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch user level');
  }

  return data.data;
}

/**
 * Get user activities
 */
export async function getUserActivities(walletAddress: string, limit = 50): Promise<Activity[]> {
  const response = await fetch(`${LEVEL_API_URL}/api/user/${walletAddress}/activities?limit=${limit}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch user activities');
  }

  return data.data.activities;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 100): Promise<UserLevel[]> {
  const response = await fetch(`${LEVEL_API_URL}/api/leaderboard?limit=${limit}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch leaderboard');
  }

  return data.data.leaderboard;
}

/**
 * Format activity type for display
 */
export function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    'TICKET_MINTED': 'Ticket Minted',
    'TICKET_PURCHASED': 'Ticket Purchased',
    'TICKET_SCANNED': 'Event Attended',
    'TICKET_COLLECTIBLE': 'Collectible Upgraded',
    'EVENT_CREATED': 'Event Created',
  };

  return typeMap[type] || type;
}

/**
 * Get activity icon
 */
export function getActivityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'TICKET_MINTED': '🎫',
    'TICKET_PURCHASED': '🛒',
    'TICKET_SCANNED': '✅',
    'TICKET_COLLECTIBLE': '🏆',
    'EVENT_CREATED': '🎉',
  };

  return iconMap[type] || '📌';
}

/**
 * Format time ago
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}
