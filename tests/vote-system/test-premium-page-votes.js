// Test script to check premium page vote display
const API_BASE_URL = 'http://localhost:5000';

async function testPremiumPageVotes() {
  console.log('🔍 Testing Premium Page Vote Display...');
  console.log('=======================================');

  try {
    // 1. Get premium users
    console.log('1️⃣ Getting premium users...');
    const premiumResponse = await fetch(`${API_BASE_URL}/api/profile/premium?limit=10`);
    const premiumData = await premiumResponse.json();
    
    if (!premiumData.success) {
      console.error('❌ Failed to get premium users:', premiumData.message);
      return;
    }
    
    const premiumUsers = premiumData.data.users;
    console.log(`✅ Found ${premiumUsers.length} premium users`);
    
    // Show sample premium users
    console.log('\n📋 Sample Premium Users:');
    premiumUsers.slice(0, 5).forEach(user => {
      console.log(`   - ${user.username} (${user.displayName}) - ID: ${user._id}`);
    });

    // 2. Get vote rankings
    console.log('\n2️⃣ Getting vote rankings...');
    const rankingResponse = await fetch(`${API_BASE_URL}/api/vote/ranking?voteType=popularity_combined&limit=100`);
    const rankingData = await rankingResponse.json();
    
    if (!rankingData.success) {
      console.error('❌ Failed to get vote rankings:', rankingData.message);
      return;
    }
    
    const rankings = rankingData.data.rankings;
    console.log(`✅ Found ${rankings.length} users in rankings`);
    
    // Show sample rankings
    console.log('\n📋 Sample Rankings:');
    rankings.slice(0, 5).forEach(ranking => {
      console.log(`   - ${ranking.username} (${ranking.displayName}) - ${ranking.totalVotes} votes - ID: ${ranking._id}`);
    });

    // 3. Test mapping logic
    console.log('\n3️⃣ Testing mapping logic...');
    const voteData = {};
    rankings.forEach(ranking => {
      voteData[ranking._id] = {
        totalVotes: ranking.totalVotes,
        uniqueVoterCount: ranking.uniqueVoterCount
      };
    });

    // Test mapping for each premium user
    premiumUsers.forEach(user => {
      const userVoteData = Object.keys(voteData).find(key => {
        const voteUser = rankings.find(r => r._id === key);
        return voteUser && (
          voteUser._id === user._id ||
          voteUser.candidateId === user._id ||
          voteUser.username === user.username ||
          voteUser.displayName === user.displayName
        );
      });
      
      const voteInfo = userVoteData ? voteData[userVoteData] : { totalVotes: 0, uniqueVoterCount: 0 };
      
      console.log(`🔍 ${user.username} (${user.displayName}):`, {
        userId: user._id,
        foundVoteData: !!userVoteData,
        voteInfo: voteInfo
      });
    });

    // 4. Check specific users
    console.log('\n4️⃣ Checking specific users...');
    const testUserIds = ['68e1497370a2085990dbe6af']; // test0 user
    
    for (const userId of testUserIds) {
      console.log(`\n🔍 Checking user ${userId}...`);
      
      // Check if user is in premium users
      const premiumUser = premiumUsers.find(u => u._id === userId);
      if (premiumUser) {
        console.log('✅ User found in premium users:', {
          username: premiumUser.username,
          displayName: premiumUser.displayName
        });
      } else {
        console.log('⚠️ User not found in premium users');
      }
      
      // Check if user is in rankings
      const rankingUser = rankings.find(r => r._id === userId);
      if (rankingUser) {
        console.log('✅ User found in rankings:', {
          username: rankingUser.username,
          displayName: rankingUser.displayName,
          totalVotes: rankingUser.totalVotes,
          rank: rankingUser.rank
        });
      } else {
        console.log('⚠️ User not found in rankings');
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const fetch = require('node-fetch');
    testPremiumPageVotes();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
  }
} else {
  // Browser environment
  testPremiumPageVotes();
}

console.log('\n🎯 Premium Page Vote Test completed!');
