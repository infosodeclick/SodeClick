// Test script to check user with email test@example.com
const API_BASE_URL = 'http://localhost:5000';

async function checkTestUserViaAPI() {
  console.log('🔍 Checking user with email test@example.com...');
  console.log('===============================================');

  try {
    // 1. Search for user with email test@example.com
    console.log('1️⃣ Searching for user with email test@example.com...');
    const searchResponse = await fetch(`${API_BASE_URL}/api/users/search?q=test@example.com`);
    const searchData = await searchResponse.json();
    
    if (!searchData.success || !searchData.data.users.length) {
      console.log('❌ User with email test@example.com not found in search');
      
      // Try different search terms
      console.log('\n🔍 Trying different search terms...');
      const searchTerms = ['test', 'example'];
      
      for (const term of searchTerms) {
        const termResponse = await fetch(`${API_BASE_URL}/api/users/search?q=${term}`);
        const termData = await termResponse.json();
        
        if (termData.success && termData.data.users.length > 0) {
          console.log(`\n📋 Found users with "${term}":`);
          termData.data.users.slice(0, 10).forEach(user => {
            console.log(`   - ${user.username} (${user.displayName}) - Email: ${user.email} - ID: ${user._id}`);
            if (user.firstName && user.lastName) {
              console.log(`     First: ${user.firstName}, Last: ${user.lastName}`);
            }
          });
        }
      }
      
      return;
    }

    // Find the specific user with email test@example.com
    let testUser = null;
    for (const user of searchData.data.users) {
      if (user.email === 'test@example.com') {
        testUser = user;
        break;
      }
    }

    if (!testUser) {
      console.log('❌ User with email test@example.com not found specifically');
      console.log('\n📋 Found users with "test":');
      searchData.data.users.forEach(user => {
        console.log(`   - ${user.username} (${user.displayName}) - Email: ${user.email} - ID: ${user._id}`);
        if (user.firstName && user.lastName) {
          console.log(`     First: ${user.firstName}, Last: ${user.lastName}`);
        }
      });
      return;
    }

    console.log('✅ Found user with email test@example.com:', {
      id: testUser._id,
      username: testUser.username,
      displayName: testUser.displayName,
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName
    });

    // 2. Check vote status
    console.log('\n2️⃣ Checking vote status...');
    const voteStatusResponse = await fetch(`${API_BASE_URL}/api/vote/status/${testUser._id}?voteType=popularity_combined`);
    const voteStatusData = await voteStatusResponse.json();
    
    if (voteStatusData.success) {
      const voteStats = voteStatusData.data.voteStats;
      console.log('✅ Vote Status API:', {
        popularity_combined: voteStats.popularity_combined || { totalVotes: 0, uniqueVoters: 0 },
        popularity_male: voteStats.popularity_male || { totalVotes: 0, uniqueVoters: 0 },
        popularity_female: voteStats.popularity_female || { totalVotes: 0, uniqueVoters: 0 }
      });
    } else {
      console.error('❌ Vote Status API failed:', voteStatusData.message);
    }

    // 3. Check vote ranking
    console.log('\n3️⃣ Checking vote ranking...');
    const rankingResponse = await fetch(`${API_BASE_URL}/api/vote/ranking?voteType=popularity_combined&limit=100`);
    const rankingData = await rankingResponse.json();
    
    if (rankingData.success) {
      const testRanking = rankingData.data.rankings.find(user => user._id === testUser._id);
      if (testRanking) {
        console.log('✅ Vote Ranking API:', {
          totalVotes: testRanking.totalVotes,
          uniqueVoterCount: testRanking.uniqueVoterCount,
          rank: testRanking.rank
        });
      } else {
        console.log('⚠️ User not found in ranking');
      }
    } else {
      console.error('❌ Vote Ranking API failed:', rankingData.message);
    }

    // 4. Check vote history
    console.log('\n4️⃣ Checking vote history...');
    const historyResponse = await fetch(`${API_BASE_URL}/api/vote/history/${testUser._id}?type=received&limit=100`);
    const historyData = await historyResponse.json();
    
    if (historyData.success) {
      console.log('✅ Vote History API:', {
        totalVotesReceived: historyData.data.stats.totalVotesReceived,
        totalVotesCast: historyData.data.stats.totalVotesCast,
        uniqueVoters: historyData.data.stats.uniqueVoters.length,
        uniqueCandidates: historyData.data.stats.uniqueCandidates.length
      });
      
      // Analyze vote types
      const voteTypes = {};
      historyData.data.votes.forEach(vote => {
        if (vote.type === 'received') {
          voteTypes[vote.voteType] = (voteTypes[vote.voteType] || 0) + vote.votePoints;
        }
      });
      
      console.log('📊 Vote Types Breakdown:', voteTypes);
      
      // Show recent votes
      console.log('\n📅 Recent votes (last 10):');
      historyData.data.votes.slice(0, 10).forEach(vote => {
        if (vote.type === 'received') {
          console.log(`   ${vote.votedAt} - ${vote.voter.username} - ${vote.voteType} - ${vote.votePoints} points`);
        }
      });
    } else {
      console.error('❌ Vote History API failed:', historyData.message);
    }

    // 5. Summary
    console.log('\n5️⃣ Summary:');
    console.log('============');
    
    const statusVotes = voteStatusData.success ? 
      (voteStatusData.data.voteStats?.popularity_combined?.totalVotes || 0) : 0;
    const rankingVotes = rankingData.success ? 
      (rankingData.data.rankings.find(user => user._id === testUser._id)?.totalVotes || 0) : 0;
    const historyVotes = historyData.success ? historyData.data.stats.totalVotesReceived : 0;
    
    console.log(`📊 Vote Count Comparison:`);
    console.log(`   Vote Status API: ${statusVotes}`);
    console.log(`   Vote Ranking API: ${rankingVotes}`);
    console.log(`   Vote History API: ${historyVotes}`);
    
    if (statusVotes !== rankingVotes) {
      console.log('⚠️ INCONSISTENCY DETECTED!');
      console.log(`   Difference: ${Math.abs(statusVotes - rankingVotes)} votes`);
      
      if (statusVotes > rankingVotes) {
        console.log('   Status API shows MORE votes than Ranking API');
        console.log(`   Status: ${statusVotes}, Ranking: ${rankingVotes}`);
        console.log('   This explains why Top Vote shows 408 but other places show 154');
      } else {
        console.log('   Ranking API shows MORE votes than Status API');
        console.log(`   Ranking: ${rankingVotes}, Status: ${statusVotes}`);
      }
    } else {
      console.log('✅ Vote counts are consistent between APIs');
    }

    // 6. Check if user appears in Top Vote
    console.log('\n6️⃣ Checking Top Vote appearance...');
    if (rankingData.success && rankingData.data.rankings.find(user => user._id === testUser._id)) {
      const topVoteUser = rankingData.data.rankings.find(user => user._id === testUser._id);
      console.log('✅ User appears in Top Vote:', {
        rank: topVoteUser.rank,
        totalVotes: topVoteUser.totalVotes,
        uniqueVoterCount: topVoteUser.uniqueVoterCount
      });
    } else {
      console.log('⚠️ User does not appear in Top Vote ranking');
    }

    // 7. Check premium users
    console.log('\n7️⃣ Checking premium users...');
    const premiumResponse = await fetch(`${API_BASE_URL}/api/profile/premium?limit=100`);
    const premiumData = await premiumResponse.json();
    
    if (premiumData.success) {
      const testPremium = premiumData.data.users.find(user => user._id === testUser._id);
      if (testPremium) {
        console.log('✅ User found in premium users:', {
          username: testPremium.username,
          displayName: testPremium.displayName,
          membership: testPremium.membership
        });
      } else {
        console.log('⚠️ User not found in premium users');
      }
    } else {
      console.error('❌ Premium Users API failed:', premiumData.message);
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
    checkTestUserViaAPI();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
  }
} else {
  // Browser environment
  checkTestUserViaAPI();
}

console.log('\n🎯 Test completed!');
