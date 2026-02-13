import axios from 'axios';

// Multiple Polymarket endpoints for comprehensive data
const POLYMARKET_ENDPOINTS = {
  CLOB: 'https://clob.polymarket.com',
  GAMMA: 'https://gamma-api.polymarket.com',
  STRAPI: 'https://strapi-matic.poly.market'
};

// Fetch markets from multiple sources and merge
export async function fetchPolymarketComprehensive() {
  const allMarkets = new Map(); // Use map to deduplicate by ID
  
  // 1. Try CLOB API (most reliable)
  try {
    const response = await axios.get(`${POLYMARKET_ENDPOINTS.CLOB}/markets?active=true`, {
      timeout: 10000
    });
    
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(market => {
        if (market.question && !market.closed) {
          allMarkets.set(market.conditionId, {
            id: market.conditionId,
            question: market.question,
            description: market.description || '',
            volume: parseFloat(market.volume || 0),
            liquidity: parseFloat(market.liquidity || 0),
            endDate: market.endDate,
            tags: market.tags || [],
            outcomes: market.outcomes || ['Yes', 'No'],
            slug: market.slug,
            active: market.active,
            closed: market.closed,
            url: `https://polymarket.com/market/${market.slug || market.conditionId}`,
            source: 'polymarket'
          });
        }
      });
    }
  } catch (error) {
    console.error('CLOB API error:', error.message);
  }
  
  // 2. Try Strapi content API for featured markets
  try {
    const response = await axios.get(`${POLYMARKET_ENDPOINTS.STRAPI}/markets?_limit=100`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(market => {
        if (market.question && !allMarkets.has(market.slug)) {
          allMarkets.set(market.slug, {
            id: market.slug,
            question: market.question,
            description: market.description || '',
            volume: parseFloat(market.volume || 0),
            featured: true,
            category: market.category,
            image: market.image,
            url: `https://polymarket.com/market/${market.slug}`,
            source: 'polymarket'
          });
        }
      });
    }
  } catch (error) {
    console.error('Strapi API error:', error.message);
  }
  
  // 3. Try Gamma API for aggregated data
  try {
    const response = await axios.get(`${POLYMARKET_ENDPOINTS.GAMMA}/markets`, {
      params: {
        limit: 100,
        active: true,
        order: 'volume',
        direction: 'desc'
      },
      timeout: 5000
    });
    
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(market => {
        const existingMarket = allMarkets.get(market.id);
        if (existingMarket) {
          // Update with gamma data if available
          existingMarket.volume24hr = parseFloat(market.volume24hr || 0);
          existingMarket.liquidityNum = parseFloat(market.liquidityNum || 0);
          existingMarket.outcomePrices = market.outcomePrices;
        }
      });
    }
  } catch (error) {
    console.error('Gamma API error:', error.message);
  }
  
  // Convert map to array and sort by volume
  return Array.from(allMarkets.values())
    .sort((a, b) => (b.volume || 0) - (a.volume || 0));
}

// Search Polymarket for specific queries
export async function searchPolymarket(query) {
  try {
    const response = await axios.get(`${POLYMARKET_ENDPOINTS.GAMMA}/markets`, {
      params: {
        search: query,
        limit: 20,
        active: true
      },
      timeout: 5000
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(market => ({
        id: market.id,
        question: market.question,
        volume: parseFloat(market.volume || 0),
        url: `https://polymarket.com/market/${market.slug || market.id}`,
        source: 'polymarket'
      }));
    }
  } catch (error) {
    console.error('Polymarket search error:', error.message);
  }
  
  return [];
}

// Get top markets by category
export async function getTopMarketsByCategory() {
  const markets = await fetchPolymarketComprehensive();
  const categories = {};
  
  // Common category keywords
  const categoryKeywords = {
    'Politics': ['election', 'president', 'congress', 'senate', 'vote', 'trump', 'biden'],
    'Crypto': ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'defi'],
    'Sports': ['nfl', 'nba', 'super bowl', 'world cup', 'championship'],
    'Economics': ['recession', 'inflation', 'fed', 'gdp', 'unemployment'],
    'Technology': ['ai', 'apple', 'google', 'microsoft', 'tech'],
    'Entertainment': ['movie', 'oscar', 'album', 'concert']
  };
  
  markets.forEach(market => {
    let assigned = false;
    const questionLower = market.question.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => questionLower.includes(kw))) {
        if (!categories[category]) categories[category] = [];
        categories[category].push(market);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      if (!categories['Other']) categories['Other'] = [];
      categories['Other'].push(market);
    }
  });
  
  // Keep only top 5 per category
  Object.keys(categories).forEach(cat => {
    categories[cat] = categories[cat].slice(0, 5);
  });
  
  return categories;
}

// Test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Fetching comprehensive Polymarket data...');
  
  const markets = await fetchPolymarketComprehensive();
  console.log(`Total markets found: ${markets.length}`);
  
  console.log('\nTop 5 markets by volume:');
  markets.slice(0, 5).forEach(m => {
    console.log(`- ${m.question.substring(0, 60)}... ($${Math.round(m.volume).toLocaleString()})`);
  });
  
  console.log('\nSearching for "bitcoin" markets...');
  const btcMarkets = await searchPolymarket('bitcoin');
  console.log(`Found ${btcMarkets.length} Bitcoin-related markets`);
  
  console.log('\nTop markets by category:');
  const byCategory = await getTopMarketsByCategory();
  Object.entries(byCategory).forEach(([cat, markets]) => {
    console.log(`\n${cat}: ${markets.length} markets`);
    markets.slice(0, 2).forEach(m => {
      console.log(`  - ${m.question.substring(0, 50)}...`);
    });
  });
}