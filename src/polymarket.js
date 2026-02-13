import axios from 'axios';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

export async function fetchActiveMarkets(limit = 50) {
  try {
    // Get active markets sorted by total volume (more established markets)
    const response = await axios.get(`${POLYMARKET_API}/markets`, {
      params: {
        active: true,
        closed: false,
        limit,
        order: 'volume',
        direction: 'desc'
      }
    });
    
    return response.data.map(market => ({
      id: market.id,
      question: market.question,
      description: market.description,
      volume: market.volume,
      volume24hr: market.volume24hr,
      endDate: market.endDate,
      tags: market.tags || [],
      url: `https://polymarket.com/market/${market.slug || market.id}`
    }));
  } catch (error) {
    console.error('Error fetching Polymarket data:', error.message);
    return [];
  }
}

// Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  const markets = await fetchActiveMarkets(10);
  console.log(`Found ${markets.length} active markets:`);
  markets.forEach(m => {
    console.log(`- ${m.question.substring(0, 60)}... (Volume: $${Math.round(m.volume24hr).toLocaleString()})`);
  });
}