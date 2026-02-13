import axios from 'axios';

const HASURA_ENDPOINT = 'https://dev-api.42.space/v1/graphql';

async function findMarketByTitle(title) {
  const query = `
    query FindMarket($title: String!) {
      home_market_list(
        where: { title: { _ilike: $title } }
        limit: 1
      ) {
        market_address
        title
        question_id
        status
        category_name
      }
    }
  `;

  try {
    const response = await axios.post(HASURA_ENDPOINT, {
      query,
      variables: { title: `%${title}%` }
    });
    
    return response.data.data?.home_market_list?.[0];
  } catch (error) {
    console.error('Search failed:', error.message);
    return null;
  }
}

async function testMarketUrls() {
  console.log('=== Testing 42.space URL Mapping Issue ===\n');

  // Search for a known market
  const searchTerm = "Backpack market cap";
  console.log(`Searching for: "${searchTerm}"`);
  
  const market = await findMarketByTitle(searchTerm);
  
  if (market) {
    console.log('\nFound market in API:');
    console.log('Title:', market.title);
    console.log('API Address:', market.market_address);
    console.log('Question ID:', market.question_id);
    console.log('Status:', market.status);
    
    // Test the URL with API address
    const apiUrl = `https://42.space/event/${market.market_address}`;
    console.log(`\nTesting API-based URL: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl, {
        maxRedirects: 5,
        validateStatus: () => true, // Accept any status
        timeout: 10000
      });
      
      console.log(`Status: ${response.status}`);
      
      // Check if the page contains the market title
      if (response.data && typeof response.data === 'string') {
        const hasTitle = response.data.includes(market.title);
        console.log(`Page contains market title: ${hasTitle}`);
        
        // Look for any other market addresses in the HTML
        const addressPattern = /0x[a-fA-F0-9]{40}/g;
        const foundAddresses = response.data.match(addressPattern);
        if (foundAddresses) {
          const uniqueAddresses = [...new Set(foundAddresses)];
          console.log(`\nAddresses found in page HTML:`);
          uniqueAddresses.forEach(addr => {
            if (addr !== market.market_address) {
              console.log(`  - ${addr} ${addr === '0x0842630d678d74B7E7Bb6C14091a85836229A048' ? '← THIS IS THE ADDRESS USER MENTIONED!' : ''}`);
            }
          });
        }
      }
    } catch (error) {
      console.log(`Error fetching page: ${error.message}`);
    }
  } else {
    console.log('Market not found in API');
  }
  
  // Test the specific address the user mentioned
  console.log('\n\n=== Testing User-Mentioned Address ===');
  const userAddress = '0x0842630d678d74B7E7Bb6C14091a85836229A048';
  const userUrl = `https://42.space/event/${userAddress}`;
  console.log(`URL: ${userUrl}`);
  
  try {
    const response = await axios.head(userUrl, {
      maxRedirects: 5,
      validateStatus: () => true
    });
    console.log(`Status: ${response.status}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testMarketUrls().catch(console.error);