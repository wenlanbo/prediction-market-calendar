import axios from 'axios';

const HASURA_ENDPOINT = 'https://dev-api.42.space/v1/graphql';

async function checkActualMarkets() {
  const query = `
    query GetRealMarkets {
      home_market_list(
        limit: 5,
        order_by: { created_at: desc }
      ) {
        market_address
        title
        question_id
        status
        created_at
      }
      
      # Also check raw market table
      market(
        limit: 5,
        order_by: { created_at: desc }
      ) {
        market_address
        question_id
        created_at
      }
    }
  `;

  try {
    const response = await axios.post(HASURA_ENDPOINT, { query });
    
    console.log('=== home_market_list (Latest Markets) ===');
    const homeMarkets = response.data.data?.home_market_list || [];
    homeMarkets.forEach(m => {
      console.log(`\nTitle: ${m.title?.substring(0, 60)}...`);
      console.log(`Address: ${m.market_address}`);
      console.log(`Question ID: ${m.question_id}`);
      console.log(`Status: ${m.status}`);
      console.log(`Created: ${m.created_at}`);
    });
    
    console.log('\n=== raw market table ===');
    const rawMarkets = response.data.data?.market || [];
    rawMarkets.forEach(m => {
      console.log(`\nAddress: ${m.market_address}`);
      console.log(`Question ID: ${m.question_id}`);
      console.log(`Created: ${m.created_at}`);
    });
    
    // Test if the URLs for these markets work
    if (homeMarkets.length > 0) {
      console.log('\n=== Testing if API addresses work as URLs ===');
      const testAddress = homeMarkets[0].market_address;
      const url = `https://42.space/event/${testAddress}`;
      console.log(`Testing: ${url}`);
      
      try {
        const response = await axios.head(url, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500
        });
        console.log(`Status: ${response.status} - ${response.status === 200 ? 'WORKS!' : 'Failed'}`);
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Query failed:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkActualMarkets().catch(console.error);