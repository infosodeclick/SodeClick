const axios = require('axios');
require('dotenv').config({path: './env.development'});

const RABBIT_API_URL = "https://api.pgw.rabbit.co.th";
const RABBIT_APPLICATION_ID = process.env.RABBIT_APPLICATION_ID;
const RABBIT_PUBLIC_KEY = process.env.RABBIT_PUBLIC_KEY;
const RABBIT_COMPANY_ID = process.env.RABBIT_COMPANY_ID;
const RABBIT_API_KEY = process.env.RABBIT_API_KEY;

console.log('🐇 Testing Rabbit Gateway with correct headers...');
console.log('Application ID:', RABBIT_APPLICATION_ID);
console.log('Company ID:', RABBIT_COMPANY_ID);
console.log('Public Key length:', RABBIT_PUBLIC_KEY ? RABBIT_PUBLIC_KEY.length : 0);
console.log('API Key length:', RABBIT_API_KEY ? RABBIT_API_KEY.length : 0);

async function testCorrectAuth() {
  const endpoint = RABBIT_API_URL + '/public/v2/transactions';
  
  const testPayload = {
    amount: 100,
    currency: 'THB',
    provider: 'prompt_pay',
    localId: `TEST_CORRECT_AUTH_${Date.now()}`,
    webhook: 'https://sodeclick.com/webhook-endpoint',
    locale: 'en'
  };
  
  try {
    console.log('\n🧪 Testing with correct Rabbit Gateway headers...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(endpoint, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Rabbit Gateway is working!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.vendorQrCode) {
      console.log('🎉 Got QR Code! Payment system is ready!');
    }
    
  } catch (error) {
    console.error('❌ Rabbit Gateway Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCorrectAuth();
