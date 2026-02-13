import axios from 'axios';

const HASURA_ENDPOINT = 'https://dev-api.42.space/v1/graphql';

// Test specific market address
async function testSpecificMarket(marketAddress) {
  const query = `
    query TestMarket($address: String!) {
      home_market_list(
        where: { market_address: { _eq: $address } }
        limit: 1
      ) {
        market_address
        title
        question_id
        status
        volume
      }
      
      # Also try the raw market table
      market(
        where: { market_address: { _eq: $address } }
        limit: 1
      ) {
        market_address
        question_id
      }
    }
  `;

  try {
    console.log(`\nSearching for market: ${marketAddress}`);
    const response = await axios.post(HASURA_ENDPOINT, {
      query,
      variables: { address: marketAddress }
    });

    const homeMarket = response.data.data?.home_market_list?.[0];
    const rawMarket = response.data.data?.market?.[0];
    
    if (homeMarket) {
      console.log('Found in home_market_list:', {
        address: homeMarket.market_address,
        title: homeMarket.title,
        question_id: homeMarket.question_id,
        status: homeMarket.status
      });
    } else {
      console.log('NOT found in home_market_list');
    }
    
    if (rawMarket) {
      console.log('Found in raw market table:', rawMarket);
    } else {
      console.log('NOT found in raw market table');
    }
  } catch (error) {
    console.error('Query failed:', error.message);
  }
}

// Test both addresses
async function main() {
  console.log('=== Testing 42.space Market Addresses ===');
  
  // The address from the API
  await testSpecificMarket('0xCcF0379a3177bc7CC2257e7c02318327EF2A61De');
  
  // The address the user says works in URLs
  await testSpecificMarket('0x0842630d678d74B7E7Bb6C14091a85836229A048');
  
  // Test URL accessibility
  console.log('\n=== Testing URLs ===');
  for (const address of [
    '0xCcF0379a3177bc7CC2257e7c02318327EF2A61De',
    '0x0842630d678d74B7E7Bb6C14091a85836229A048'
  ]) {
    const url = `https://42.space/event/${address}`;
    console.log(`\nChecking: ${url}`);
    try {
      const response = await axios.head(url, {
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });
      console.log(`Status: ${response.status}`);
      if (response.headers.location) {
        console.log(`Redirects to: ${response.headers.location}`);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
}

main().catch(console.error);