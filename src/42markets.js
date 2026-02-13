import axios from 'axios';

const HASURA_ENDPOINT = 'https://dev-api.42.space/v1/graphql';

// First, let's explore the schema
export async function explore42Schema() {
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(HASURA_ENDPOINT, {
      query: introspectionQuery
    });
    
    // Filter for relevant types (markets, events, etc.)
    const types = response.data.data.__schema.types
      .filter(t => t.kind === 'OBJECT' && !t.name.startsWith('__'))
      .filter(t => t.name.toLowerCase().includes('market') || 
                   t.name.toLowerCase().includes('event') ||
                   t.name.toLowerCase().includes('question'));
    
    console.log('Found types:', types.map(t => t.name));
    return types;
  } catch (error) {
    console.error('Schema exploration failed:', error.message);
  }
}

// Fetch all markets from 42
export async function fetch42Markets() {
  // Use the home_market_list view which has the best data
  const query = `query GetHomeMarkets {
    home_market_list(
      limit: 200, 
      where: { 
        status: {_in: ["live", "active"]},
        is_blacklisted: {_eq: false}
      },
      order_by: {total_volume_hmr: desc}
    ) {
      market_address
      title
      description
      outcomes
      total_volume_hmr
      market_cap_hmr
      current_end_timestamp
      current_end_timestamp_tz
      category_name
      status
      resolved_answer
      traders
      elapsed_pct
      image
    }
  }`;

  try {
    const response = await axios.post(HASURA_ENDPOINT, { 
      query 
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.data && response.data.data.home_market_list) {
      const markets = response.data.data.home_market_list;
      console.log(`Found ${markets.length} markets from 42.space`);
      
      // Normalize the data
      return markets.map(m => {
        // Handle outcomes which could be JSON or object
        let outcomes = [];
        if (m.outcomes) {
          if (typeof m.outcomes === 'string') {
            try {
              outcomes = JSON.parse(m.outcomes);
            } catch {
              outcomes = [m.outcomes];
            }
          } else if (typeof m.outcomes === 'object' && m.outcomes !== null) {
            // If it's already an object/array, use it
            outcomes = Array.isArray(m.outcomes) ? m.outcomes : Object.values(m.outcomes);
          }
        }
        
        return {
          id: m.market_address,
          contractAddress: m.market_address,
          question: m.title,
          description: m.description || '',
          volume: parseFloat(m.total_volume_hmr || 0),
          marketCap: parseFloat(m.market_cap_hmr || 0),
          endDate: m.current_end_timestamp_tz || (m.current_end_timestamp ? new Date(m.current_end_timestamp * 1000).toISOString() : null),
          outcomes: outcomes,
          category: m.category_name || 'General',
          status: m.status,
          resolved: m.resolved_answer !== null,
          resolvedAnswer: m.resolved_answer,
          traders: m.traders || 0,
          elapsedPercent: m.elapsed_pct || 0,
          image: m.image,
          // Note: 42.space URL structure doesn't match API addresses
          // The API returns market_address but URLs use a different identifier
          // Users should search for the market title on 42.space directly
          url: `https://www.42.space/event/${m.market_address}`,
          searchUrl: `https://www.42.space/search?q=${encodeURIComponent(m.title)}`,
          desktopOnly: true,
          urlNote: 'URL may not work - search for the market title on 42.space',
          source: '42'
        };
      });
    }
  } catch (error) {
    console.error('Failed to fetch 42 markets:', error.message);
  }
  
  return [];
}

// Test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Exploring 42.space schema...');
  await explore42Schema();
  
  console.log('\nFetching 42 markets...');
  const markets = await fetch42Markets();
  console.log(`Found ${markets.length} markets`);
  if (markets.length > 0) {
    console.log('Sample:', markets[0]);
  }
}