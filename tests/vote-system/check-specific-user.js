// Test script to check specific user ID from logs
const API_BASE_URL = 'http://localhost:5000';

async function checkSpecificUser() {
  console.log('🔍 Checking specific user from logs...');
  console.log('=====================================');

  // User ID from logs
  const userId = '68e1497370a2085990dbe6af';

  try {
    // 1. Check vote status
    console.log('1️⃣ Checking vote status...');
    const voteStatusResponse = await fetch(`${API_BASE_URL}/api/vote/status/${userId}?voteType=popularity_combined`);
    const voteStatusData = await voteStatusResponse.json();
    
    if (voteStatusData.success) {
      const voteStats = voteStatusData.data.voteStats;
      console.log('✅ Vote Status API:', {
        popularity_combined: voteStats.popularity_combined || { totalVotes: 0, uniqueVoters: 0 },
        popularity_male: voteStats.popularity_male || { totalVotes: 0, uniqueVoters: 0 },
        popularity_female: voteStats.popularity_female || { totalVotes: 0, uniqueVoters: 0 }
      });
      
      console.log('👤 User Info:', {
        id: voteStatusData.data.candidate.id,
        username: voteStatusData.data.candidate.username,
        displayName: voteStatusData.data.candidate.displayName,
        gender: voteStatusData.data.candidate.gender
      });
    } else {
      console.error('❌ Vote Status API failed:', voteStatusData.message);
    }

    // 2. Check vote ranking
    console.log('\n2️⃣ Checking vote ranking...');
    const rankingResponse = await fetch(`${API_BASE_URL}/api/vote/ranking?voteType=popularity_combined&limit=100`);
    const rankingData = await rankingResponse.json();
    
    if (rankingData.success) {
      const userRanking = rankingData.data.rankings.find(user => user._id === userId);
      if (userRanking) {
        console.log('✅ Vote Ranking API:', {
          totalVotes: userRanking.totalVotes,
          uniqueVoterCount: userRanking.uniqueVoterCount,
          rank: userRanking.rank,
          username: userRanking.username,
          displayName: userRanking.displayName
        });
      } else {
        console.log('⚠️ User not found in ranking');
      }
    } else {
      console.error('❌ Vote Ranking API failed:', rankingData.message);
    }

    // 3. Check vote history
    console.log('\n3️⃣ Checking vote history...');
    const historyResponse = await fetch(`${API_BASE_URL}/api/vote/history/${userId}?type=received&limit=100`);
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

    // 4. Summary
    console.log('\n4️⃣ Summary:');
    console.log('============');
    
    const statusVotes = voteStatusData.success ? 
      (voteStatusData.data.voteStats?.popularity_combined?.totalVotes || 0) : 0;
    const rankingVotes = rankingData.success ? 
      (rankingData.data.rankings.find(user => user._id === userId)?.totalVotes || 0) : 0;
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

    // 5. Check if user appears in Top Vote
    console.log('\n5️⃣ Checking Top Vote appearance...');
    if (rankingData.success && rankingData.data.rankings.find(user => user._id === userId)) {
      const topVoteUser = rankingData.data.rankings.find(user => user._id === userId);
      console.log('✅ User appears in Top Vote:', {
        rank: topVoteUser.rank,
        totalVotes: topVoteUser.totalVotes,
        uniqueVoterCount: topVoteUser.uniqueVoterCount
      });
    } else {
      console.log('⚠️ User does not appear in Top Vote ranking');
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
    checkSpecificUser();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
  }
} else {
  // Browser environment
  checkSpecificUser();
}

console.log('\n🎯 Test completed!');
