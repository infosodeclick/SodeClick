// Test script to check premium users with diamond and platinum membership
const API_BASE_URL = 'http://localhost:5000';

async function testPremiumUsersMembership() {
  console.log('🔍 Testing Premium Users Membership...');
  console.log('=====================================');

  try {
    // 1. Get premium users
    console.log('1️⃣ Getting premium users...');
    const premiumResponse = await fetch(`${API_BASE_URL}/api/profile/premium?limit=100`);
    const premiumData = await premiumResponse.json();
    
    if (!premiumData.success) {
      console.error('❌ Failed to get premium users:', premiumData.message);
      return;
    }
    
    const premiumUsers = premiumData.data.users;
    console.log(`✅ Found ${premiumUsers.length} premium users`);
    
    // 2. Analyze membership tiers
    console.log('\n2️⃣ Analyzing membership tiers...');
    const tierCounts = {};
    const tierUsers = {};
    
    premiumUsers.forEach(user => {
      const tier = user.membership?.tier || 'member';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      
      if (!tierUsers[tier]) {
        tierUsers[tier] = [];
      }
      tierUsers[tier].push({
        username: user.username,
        displayName: user.displayName,
        id: user._id
      });
    });
    
    console.log('\n📊 Membership Tier Distribution:');
    Object.keys(tierCounts).forEach(tier => {
      console.log(`   ${tier}: ${tierCounts[tier]} users`);
    });
    
    // 3. Show diamond and platinum users
    console.log('\n3️⃣ Diamond and Platinum Users:');
    
    if (tierUsers.diamond && tierUsers.diamond.length > 0) {
      console.log('\n💎 Diamond Users:');
      tierUsers.diamond.forEach(user => {
        console.log(`   - ${user.username} (${user.displayName}) - ID: ${user.id}`);
      });
    } else {
      console.log('\n💎 Diamond Users: None found');
    }
    
    if (tierUsers.platinum && tierUsers.platinum.length > 0) {
      console.log('\n🏆 Platinum Users:');
      tierUsers.platinum.forEach(user => {
        console.log(`   - ${user.username} (${user.displayName}) - ID: ${user.id}`);
      });
    } else {
      console.log('\n🏆 Platinum Users: None found');
    }
    
    // 4. Check if diamond/platinum users have vote data
    console.log('\n4️⃣ Checking vote data for diamond/platinum users...');
    
    const diamondPlatinumUsers = [
      ...(tierUsers.diamond || []),
      ...(tierUsers.platinum || [])
    ];
    
    if (diamondPlatinumUsers.length > 0) {
      // Get vote rankings
      const rankingResponse = await fetch(`${API_BASE_URL}/api/vote/ranking?voteType=popularity_combined&limit=200`);
      const rankingData = await rankingResponse.json();
      
      if (rankingData.success && rankingData.data?.rankings) {
        const rankings = rankingData.data.rankings;
        
        diamondPlatinumUsers.forEach(user => {
          const ranking = rankings.find(r => 
            r._id === user.id ||
            r.candidateId === user.id ||
            r.username === user.username ||
            r.displayName === user.displayName
          );
          
          if (ranking) {
            console.log(`✅ ${user.username} (${user.displayName}): ${ranking.totalVotes} votes`);
          } else {
            console.log(`⚠️ ${user.username} (${user.displayName}): No vote data found`);
          }
        });
      }
    }
    
    // 5. Show sample users from each tier
    console.log('\n5️⃣ Sample Users by Tier:');
    Object.keys(tierUsers).forEach(tier => {
      if (tierUsers[tier].length > 0) {
        console.log(`\n${tier.toUpperCase()} Tier:`);
        tierUsers[tier].slice(0, 3).forEach(user => {
          console.log(`   - ${user.username} (${user.displayName})`);
        });
        if (tierUsers[tier].length > 3) {
          console.log(`   ... and ${tierUsers[tier].length - 3} more`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const fetch = require('node-fetch');
    testPremiumUsersMembership();
  } catch (error) {
    console.log('📦 Installing node-fetch...');
    console.log('Please run: npm install node-fetch');
  }
} else {
  // Browser environment
  testPremiumUsersMembership();
}

console.log('\n🎯 Premium Users Membership Test completed!');
