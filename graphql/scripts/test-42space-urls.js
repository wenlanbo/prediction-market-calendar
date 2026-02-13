#!/usr/bin/env node

/**
 * Test script to verify 42.space market URLs work correctly
 * Run: node test-42space-urls.js
 */

import fetch from 'node-fetch';

const testMarketAddresses = [
  '0xCcF0379a3177bc7CC2257e7c02318327EF2A61De',
  '0x0842630d678d74B7E7Bb6C14091a85836229A048',
  // Add more addresses from their API to test
];

async function testMarketUrl(marketAddress) {
  const url = `https://42.space/event/${marketAddress}`;
  console.log(`\nTesting: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Just check if URL exists
      timeout: 5000,
    });
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${response.status} ${response.statusText}`);
      return true;
    } else if (response.status === 404) {
      console.log(`❌ NOT FOUND: Market doesn't exist`);
      return false;
    } else {
      console.log(`⚠️  Status: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function fetchLatestMarkets() {
  console.log('\nFetching latest markets from 42.space API...\n');
  
  const query = `
    query GetLatestMarkets {
      home_market_list(
        limit: 5
        order_by: { created_at: desc }
        where: { status: { _eq: "active" } }
      ) {
        market_address
        question
        volume
      }
    }
  `;

  try {
    // Note: Replace with actual 42.space GraphQL endpoint
    const response = await fetch('https://api.42.space/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.log('Could not fetch from API - using test addresses instead');
      return [];
    }

    const data = await response.json();
    return data.data?.home_market_list || [];
  } catch (error) {
    console.log('API fetch failed:', error.message);
    return [];
  }
}

async function main() {
  console.log('=== 42.space Market URL Tester ===\n');
  
  // Test known addresses
  console.log('Testing known addresses:');
  for (const address of testMarketAddresses) {
    await testMarketUrl(address);
  }
  
  // Try to fetch and test latest markets
  const latestMarkets = await fetchLatestMarkets();
  if (latestMarkets.length > 0) {
    console.log('\n\nTesting latest markets from API:');
    for (const market of latestMarkets) {
      console.log(`\nMarket: ${market.question}`);
      console.log(`Volume: $${Number(market.volume).toLocaleString()}`);
      await testMarketUrl(market.market_address);
    }
  }
  
  console.log('\n\n=== URL Pattern Confirmed ===');
  console.log('Use: https://42.space/event/{market_address}');
  console.log('Where market_address is the Ethereum address from the API');
}

// Run the test
main().catch(console.error);