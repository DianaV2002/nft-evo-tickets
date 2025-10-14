import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const LEVEL_API_URL = process.env.LEVEL_API_URL || 'http://localhost:3001';

/**
 * Test script for Level System API
 * Run with: npx tsx scripts/test-level-system.ts [wallet_address]
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n📡 Testing Health Check...', colors.blue);

  try {
    const response = await fetch(`${LEVEL_API_URL}/health`);
    const data = await response.json();

    if (data.status === 'ok') {
      log('✅ Health check passed', colors.green);
      log(`   Service: ${data.service}`);
      log(`   Cluster: ${data.cluster}`);
    } else {
      log('❌ Health check failed', colors.red);
    }
  } catch (error) {
    log('❌ Could not connect to Level System API', colors.red);
    log(`   Make sure it's running on ${LEVEL_API_URL}`, colors.yellow);
    throw error;
  }
}

async function testGetLevels() {
  log('\n🎯 Testing Get Levels...', colors.blue);

  const response = await fetch(`${LEVEL_API_URL}/api/levels`);
  const data = await response.json();

  if (data.success) {
    log('✅ Levels retrieved successfully', colors.green);
    data.data.forEach((level: any) => {
      log(`   ${level.emoji} ${level.name} - ${level.minPoints}+ pts`);
    });
  } else {
    log('❌ Failed to get levels', colors.red);
  }
}

async function testGetUserLevel(walletAddress: string) {
  log('\n👤 Testing Get User Level...', colors.blue);
  log(`   Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`);

  const response = await fetch(`${LEVEL_API_URL}/api/user/${walletAddress}`);
  const data = await response.json();

  if (data.success) {
    log('✅ User level retrieved', colors.green);
    log(`   Level: ${data.data.currentLevel}`);
    log(`   Points: ${data.data.totalPoints}`);
    log(`   Progress to next: ${data.data.progressToNext.toFixed(1)}%`);
  } else {
    log('❌ Failed to get user level', colors.red);
  }
}

async function testGetUserActivities(walletAddress: string) {
  log('\n📊 Testing Get User Activities...', colors.blue);

  const response = await fetch(`${LEVEL_API_URL}/api/user/${walletAddress}/activities?limit=5`);
  const data = await response.json();

  if (data.success) {
    log(`✅ Activities retrieved: ${data.data.count} total`, colors.green);

    if (data.data.activities.length > 0) {
      data.data.activities.forEach((activity: any) => {
        log(`   - ${activity.activityType}: +${activity.pointsEarned} pts`);
      });
    } else {
      log('   No activities yet', colors.yellow);
    }
  } else {
    log('❌ Failed to get user activities', colors.red);
  }
}

async function testGetLeaderboard() {
  log('\n🏆 Testing Get Leaderboard...', colors.blue);

  const response = await fetch(`${LEVEL_API_URL}/api/leaderboard?limit=5`);
  const data = await response.json();

  if (data.success) {
    log(`✅ Leaderboard retrieved: ${data.data.count} users`, colors.green);

    if (data.data.leaderboard.length > 0) {
      data.data.leaderboard.forEach((user: any, index: number) => {
        log(`   ${index + 1}. ${user.walletAddress.slice(0, 8)}... - ${user.totalPoints} pts (${user.currentLevelData.emoji} ${user.currentLevelData.name})`);
      });
    } else {
      log('   No users yet', colors.yellow);
    }
  } else {
    log('❌ Failed to get leaderboard', colors.red);
  }
}

async function testAddActivity(walletAddress: string) {
  log('\n➕ Testing Add Activity (Manual)...', colors.blue);

  const testActivity = {
    walletAddress,
    activityType: 'TICKET_MINTED',
    transactionSignature: `test_${Date.now()}`,
    metadata: { test: true }
  };

  const response = await fetch(`${LEVEL_API_URL}/api/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testActivity)
  });

  const data = await response.json();

  if (data.success) {
    log('✅ Activity added successfully', colors.green);
    log(`   Points earned: +${data.data.pointsEarned}`);
    log(`   New total: ${data.data.newTotal}`);
  } else {
    log('⚠️  Activity not added (possibly duplicate)', colors.yellow);
  }
}

async function runTests() {
  const walletAddress = process.argv[2];

  log('\n' + '='.repeat(60), colors.blue);
  log('🧪 Level System API Test Suite', colors.blue);
  log('='.repeat(60), colors.blue);

  try {
    // Always run these tests
    await testHealthCheck();
    await testGetLevels();
    await testGetLeaderboard();

    // Only run user-specific tests if wallet address provided
    if (walletAddress) {
      await testGetUserLevel(walletAddress);
      await testGetUserActivities(walletAddress);
      await testAddActivity(walletAddress);

      // Check updated level
      await testGetUserLevel(walletAddress);
    } else {
      log('\n💡 Tip: Run with a wallet address to test user-specific endpoints:', colors.yellow);
      log('   npx tsx scripts/test-level-system.ts YOUR_WALLET_ADDRESS', colors.yellow);
    }

    log('\n' + '='.repeat(60), colors.green);
    log('✅ All tests completed!', colors.green);
    log('='.repeat(60), colors.green);
  } catch (error) {
    log('\n' + '='.repeat(60), colors.red);
    log('❌ Tests failed with error:', colors.red);
    log('='.repeat(60), colors.red);
    console.error(error);
    process.exit(1);
  }
}

runTests();
