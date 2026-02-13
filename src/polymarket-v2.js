import axios from 'axios';

const POLYMARKET_API = 'https://clob.polymarket.com';

export async function fetchActiveMarkets() {
  try {
    // Using the CLOB API for better data
    const response = await axios.get(`${POLYMARKET_API}/markets`, {
      params: {
        active: true
      }
    });
    
    // Filter and sort by liquidity/volume
    const markets = response.data
      .filter(m => m.active && !m.closed && m.volume > 10000) // Only markets with decent volume
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50);
    
    return markets.map(market => ({
      id: market.conditionId,
      question: market.question,
      description: market.description || '',
      volume: market.volume,
      liquidity: market.liquidity,
      endDate: market.endDate,
      tags: market.tags || [],
      outcomes: market.outcomes || ['Yes', 'No'],
      url: `https://polymarket.com/market/${market.conditionId}`
    }));
  } catch (error) {
    console.error('Error fetching Polymarket data:', error.message);
    // Fallback to hardcoded example data for POC
    return getExampleMarkets();
  }
}

function getExampleMarkets() {
  return [
    {
      id: '1',
      question: 'Will Donald Trump be the 2024 Republican nominee?',
      volume: 5000000,
      endDate: '2024-07-15',
      tags: ['Politics', 'US Election'],
      url: 'https://polymarket.com/market/example1'
    },
    {
      id: '2',
      question: 'Will Bitcoin reach $100,000 in 2024?',
      volume: 3000000,
      endDate: '2024-12-31',
      tags: ['Crypto', 'Bitcoin'],
      url: 'https://polymarket.com/market/example2'
    },
    {
      id: '3',
      question: 'Will there be a recession in 2024?',
      volume: 2000000,
      endDate: '2024-12-31',
      tags: ['Economy'],
      url: 'https://polymarket.com/market/example3'
    }
  ];
}

// Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  const markets = await fetchActiveMarkets();
  console.log(`Found ${markets.length} active markets:`);
  markets.forEach(m => {
    console.log(`- ${m.question} (Volume: $${Math.round(m.volume).toLocaleString()})`);
  });
}