// Test script to check HeartVote hasVoted functionality
const API_BASE_URL = 'http://localhost:5000';

async function testHeartVoteHasVoted() {
  console.log('🔍 Testing HeartVote hasVoted functionality...');
  console.log('==============================================');

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
    
    // 2. Test vote status for each premium user
    console.log('\n2️⃣ Testing vote status for premium users...');
    
    for (const user of premiumUsers.slice(0, 3)) { // Test first 3 users
      console.log(`\n🔍 Testing user: ${user.username} (${user.displayName})`);
      
      try {
        // Test vote status API
        const voteStatusResponse = await fetch(`${API_BASE_URL}/api/vote/status/${user._id}?voteType=popularity_combined`);
        const voteStatusData = await voteStatusResponse.json();
        
        if (voteStatusData.success) {
          const hasVoted = voteStatusData.data.hasVoted;
          const totalVotes = voteStatusData.data.voteStats?.popularity_combined?.totalVotes || 0;
          
          console.log(`   ✅ Vote Status:`, {
            hasVoted: hasVoted,
            totalVotes: totalVotes,
            userId: user._id
          });
          
          // Test vote action (simulate voting)
          if (!hasVoted) {
            console.log(`   🗳️ User has not voted yet - HeartVote should show gray star`);
          } else {
            console.log(`   ⭐ User has voted - HeartVote should show gold star`);
          }
        } else {
          console.log(`   ❌ Failed to get vote status:`, voteStatusData.message);
        }
      } catch (error) {
        console.log(`   ❌ Error testing vote status:`, error.message);
      }
    }
    
    // 3. Test HeartVote component behavior
    console.log('\n3️⃣ HeartVote Component Behavior:');
    console.log('   📝 When hasVoted prop is NOT provided:');
    console.log('      - HeartVote will call API to check vote status');
    console.log('      - Star icon will show correct color based on actual vote status');
    console.log('      - After voting, star will change to gold color');
    console.log('      - After unvoting, star will change back to gray color');
    
    console.log('\n   📝 When hasVoted prop is provided (hardcoded):');
    console.log('      - HeartVote will use the provided value');
    console.log('      - Star icon will NOT change after voting');
    console.log('      - This causes the bug where star stays gray');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const fetch = require('node-fetch');
    testHeartVoteHasVoted();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
  }
} else {
  // Browser environment
  testHeartVoteHasVoted();
}

console.log('\n🎯 HeartVote hasVoted Test completed!');
