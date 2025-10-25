/**
 * Test script to verify vote system consistency
 * This script tests the vote API endpoints to ensure data consistency
 */

const API_BASE_URL = 'http://localhost:5000';

// Test data
const testCandidateId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
const testVoterId = '507f1f77bcf86cd799439012'; // Replace with actual user ID

async function testVoteConsistency() {
  console.log('🧪 Testing Vote System Consistency...\n');

  try {
    // Test 1: Get vote status
    console.log('1️⃣ Testing Vote Status API...');
    const statusResponse = await fetch(`${API_BASE_URL}/api/vote/status/${testCandidateId}?voteType=popularity_combined&voterId=${testVoterId}`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Vote Status API Response:');
      console.log('   - Vote Stats:', statusData.data.voteStats);
      console.log('   - Has Voted:', statusData.data.hasVoted);
      console.log('   - Requested Vote Type:', statusData.data.requestedVoteType);
    } else {
      console.log('❌ Vote Status API Error:', statusData.message);
    }

    // Test 2: Get vote ranking
    console.log('\n2️⃣ Testing Vote Ranking API...');
    const rankingResponse = await fetch(`${API_BASE_URL}/api/vote/ranking?voteType=popularity_combined&limit=10`);
    const rankingData = await rankingResponse.json();
    
    if (rankingData.success) {
      console.log('✅ Vote Ranking API Response:');
      console.log('   - Total Rankings:', rankingData.data.rankings.length);
      console.log('   - First User Total Votes:', rankingData.data.rankings[0]?.totalVotes);
      console.log('   - First User Unique Voters:', rankingData.data.rankings[0]?.uniqueVoterCount);
    } else {
      console.log('❌ Vote Ranking API Error:', rankingData.message);
    }

    // Test 3: Compare data consistency
    console.log('\n3️⃣ Testing Data Consistency...');
    
    if (statusData.success && rankingData.success) {
      const candidateInRanking = rankingData.data.rankings.find(user => user._id === testCandidateId);
      
      if (candidateInRanking) {
        const statusVotes = statusData.data.voteStats?.popularity_combined?.totalVotes || 0;
        const rankingVotes = candidateInRanking.totalVotes;
        
        console.log('📊 Comparing vote counts:');
        console.log('   - Status API votes:', statusVotes);
        console.log('   - Ranking API votes:', rankingVotes);
        
        if (statusVotes === rankingVotes) {
          console.log('✅ Vote counts are consistent!');
        } else {
          console.log('❌ Vote counts are inconsistent!');
          console.log('   Difference:', Math.abs(statusVotes - rankingVotes));
        }
      } else {
        console.log('⚠️ Candidate not found in ranking (may not have votes)');
      }
    }

    // Test 4: Test different vote types
    console.log('\n4️⃣ Testing Different Vote Types...');
    
    const voteTypes = ['popularity_combined', 'popularity_male', 'popularity_female'];
    
    for (const voteType of voteTypes) {
      const response = await fetch(`${API_BASE_URL}/api/vote/status/${testCandidateId}?voteType=${voteType}`);
      const data = await response.json();
      
      if (data.success) {
        const votes = data.data.voteStats?.[voteType]?.totalVotes || 0;
        console.log(`   - ${voteType}: ${votes} votes`);
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
    testVoteConsistency();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
    console.log('Or run: cd tests/vote-system && npm install');
  }
} else {
  // Browser environment
  testVoteConsistency();
}

console.log('\n🎯 Test completed! Check the results above for any inconsistencies.');
