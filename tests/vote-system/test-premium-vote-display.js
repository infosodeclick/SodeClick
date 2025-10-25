/**
 * Test script specifically for Premium page vote display
 * This script tests the HeartVote component on premium users
 */

const API_BASE_URL = 'http://localhost:5000';

// Test premium user data
const testPremiumUser = {
  _id: '507f1f77bcf86cd799439011', // Replace with actual premium user ID
  username: 'premium_user',
  displayName: 'Premium User',
  gender: 'female',
  membership: {
    tier: 'gold'
  }
};

async function testPremiumVoteDisplay() {
  console.log('🧪 Testing Premium Page Vote Display...\n');

  try {
    // Test 1: Get premium user vote status
    console.log('1️⃣ Testing Premium User Vote Status...');
    const statusResponse = await fetch(`${API_BASE_URL}/api/vote/status/${testPremiumUser._id}?voteType=popularity_combined`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Premium User Vote Status:');
      console.log('   - User ID:', statusData.data.candidate.id);
      console.log('   - Vote Stats:', statusData.data.voteStats);
      console.log('   - Requested Vote Type:', statusData.data.requestedVoteType);
      
      const combinedVotes = statusData.data.voteStats?.popularity_combined?.totalVotes || 0;
      console.log('   - Combined Votes:', combinedVotes);
    } else {
      console.log('❌ Premium User Vote Status Error:', statusData.message);
    }

    // Test 2: Check if user has any votes
    console.log('\n2️⃣ Checking Vote Data...');
    
    if (statusData.success) {
      const voteStats = statusData.data.voteStats;
      let totalVotes = 0;
      
      Object.keys(voteStats).forEach(voteType => {
        const votes = voteStats[voteType].totalVotes;
        console.log(`   - ${voteType}: ${votes} votes`);
        totalVotes += votes;
      });
      
      console.log(`   - Total Votes: ${totalVotes}`);
      
      if (totalVotes === 0) {
        console.log('⚠️ This user has no votes yet');
        console.log('   - Try voting for this user first');
        console.log('   - Or test with a different user who has votes');
      }
    }

    // Test 3: Test HeartVote component data structure
    console.log('\n3️⃣ Testing HeartVote Component Data...');
    
    if (statusData.success) {
      const voteType = 'popularity_combined';
      const voteStats = statusData.data.voteStats?.[voteType] || { totalVotes: 0, uniqueVoters: 0 };
      const totalVotes = voteStats.totalVotes;
      
      console.log('   - Vote Type:', voteType);
      console.log('   - Vote Stats:', voteStats);
      console.log('   - Total Votes:', totalVotes);
      console.log('   - Formatted Count:', formatVoteCount(totalVotes));
    }

    // Test 4: Test API endpoint directly
    console.log('\n4️⃣ Testing API Endpoint...');
    
    const testResponse = await fetch(`${API_BASE_URL}/api/vote/status/${testPremiumUser._id}?voteType=popularity_combined&voterId=test`);
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ API Endpoint Working:');
      console.log('   - Response Status:', testResponse.status);
      console.log('   - Data Structure:', Object.keys(testData.data));
    } else {
      console.log('❌ API Endpoint Error:', testData.message);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Helper function to format vote count (same as voteHelpers.formatVoteCount)
function formatVoteCount(count) {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const fetch = require('node-fetch');
    testPremiumVoteDisplay();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
    console.log('Or run: cd tests/vote-system && npm install');
  }
} else {
  // Browser environment
  testPremiumVoteDisplay();
}

console.log('\n🎯 Premium Vote Display Test completed!');
console.log('📝 Check browser console for HeartVote debug logs when viewing premium page');
