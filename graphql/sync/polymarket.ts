import { GraphQLClient } from 'graphql-request';
import { Pool } from 'pg';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_GRAPHQL = 'https://api.thegraph.com/subgraphs/name/polymarket/matic-markets';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description?: string;
  endDate: string;
  volume: string;
  liquidity: string;
  probability?: number;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
  category?: string;
  tags?: string[];
}

const POLYMARKET_MARKETS_QUERY = `
  query GetMarkets($first: Int!, $skip: Int!) {
    markets(
      first: $first
      skip: $skip
      where: { closed: false }
      orderBy: volume
      orderDirection: desc
    ) {
      id
      question
      slug
      endDate
      volume
      liquidity
      outcomeTokenPrices
      outcomes
      category
      tags
    }
  }
`;

export async function syncPolymarketEvents(source: any, pool: Pool) {
  console.log('Syncing Polymarket events...');
  
  const client = new GraphQLClient(POLYMARKET_GRAPHQL);
  let processed = 0;
  let added = 0;
  let updated = 0;
  let skip = 0;
  const limit = 100;

  // First, ensure we have Polymarket categories in our system
  await ensurePolymarketCategories(pool);

  while (true) {
    try {
      const data: any = await client.request(POLYMARKET_MARKETS_QUERY, {
        first: limit,
        skip: skip,
      });

      if (!data.markets || data.markets.length === 0) break;

      for (const market of data.markets) {
        processed++;
        
        // Check if event exists
        const { rows: existing } = await pool.query(
          'SELECT id, probability, volume FROM event WHERE source_id = $1 AND external_id = $2',
          [source.id, market.id]
        );

        const marketData = transformPolymarketData(market);
        
        if (existing.length === 0) {
          // Insert new event
          await insertEvent(pool, source.id, marketData);
          added++;
        } else {
          // Update existing event if data changed
          const existingEvent = existing[0];
          if (shouldUpdateEvent(existingEvent, marketData)) {
            await updateEvent(pool, existingEvent.id, marketData);
            updated++;
          }
        }
      }

      skip += limit;
      
      // Limit total markets to sync (avoid rate limits)
      if (processed >= 500) break;
      
    } catch (error) {
      console.error('Error fetching Polymarket data:', error);
      throw error;
    }
  }

  console.log(`Polymarket sync complete: ${processed} processed, ${added} added, ${updated} updated`);
  return { processed, added, updated };
}

function transformPolymarketData(market: any): any {
  // Calculate probability from outcome prices
  const probability = market.outcomeTokenPrices && market.outcomeTokenPrices[0]
    ? parseFloat(market.outcomeTokenPrices[0])
    : null;

  // Parse volume and liquidity
  const volume = parseFloat(market.volume || '0') / 1e18; // Convert from wei
  const liquidity = parseFloat(market.liquidity || '0') / 1e18;

  return {
    external_id: market.id,
    title: market.question,
    slug: market.slug || market.id,
    description: market.description || market.question,
    end_date: new Date(parseInt(market.endDate) * 1000).toISOString(),
    probability,
    volume,
    liquidity,
    source_url: `https://polymarket.com/event/${market.slug || market.id}`,
    category: market.category,
    tags: market.tags || [],
    outcomes: market.outcomes || [],
  };
}

async function insertEvent(pool: Pool, sourceId: number, data: any) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert main event
    const { rows: [event] } = await client.query(`
      INSERT INTO event (
        source_id, external_id, title, slug, description,
        end_date, probability, volume, liquidity, source_url,
        status, event_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', 'prediction')
      RETURNING id
    `, [
      sourceId, data.external_id, data.title, data.slug, data.description,
      data.end_date, data.probability, data.volume, data.liquidity, data.source_url,
    ]);

    // Insert metadata
    await client.query(`
      INSERT INTO event_metadata (event_id, resolution_criteria, additional_info)
      VALUES ($1, $2, $3)
    `, [event.id, data.description, JSON.stringify({ category: data.category })]);

    // Insert outcomes
    for (let i = 0; i < data.outcomes.length; i++) {
      const outcome = data.outcomes[i];
      const { rows: [outcomeRow] } = await client.query(`
        INSERT INTO outcome (event_id, name, probability, display_order)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [event.id, outcome, data.probability && i === 0 ? data.probability : null, i]);

      // Add outcome metadata if needed
      await client.query(`
        INSERT INTO outcome_metadata (outcome_id, symbol)
        VALUES ($1, $2)
      `, [outcomeRow.id, outcome.substring(0, 10).toUpperCase()]);
    }

    // Handle categories and tags
    await handleEventTaxonomy(client, event.id, data.category, data.tags);

    // Add initial price history
    if (data.probability) {
      await client.query(`
        INSERT INTO price_history (event_id, timestamp, price, volume_24h)
        VALUES ($1, NOW(), $2, $3)
      `, [event.id, data.probability, data.volume]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateEvent(pool: Pool, eventId: string, data: any) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Update main event
    await client.query(`
      UPDATE event SET
        probability = $2,
        volume = $3,
        liquidity = $4,
        updated_at = NOW()
      WHERE id = $1
    `, [eventId, data.probability, data.volume, data.liquidity]);

    // Add to price history if probability changed significantly
    await client.query(`
      INSERT INTO price_history (event_id, timestamp, price, volume_24h)
      SELECT $1, NOW(), $2, $3
      WHERE NOT EXISTS (
        SELECT 1 FROM price_history 
        WHERE event_id = $1 
        AND timestamp > NOW() - INTERVAL '1 hour'
        AND ABS(price - $2) < 0.01
      )
    `, [eventId, data.probability, data.volume]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function shouldUpdateEvent(existing: any, newData: any): boolean {
  // Update if probability changed by more than 1%
  if (Math.abs((existing.probability || 0) - (newData.probability || 0)) > 0.01) {
    return true;
  }
  
  // Update if volume increased significantly
  if (newData.volume > existing.volume * 1.1) {
    return true;
  }
  
  return false;
}

async function ensurePolymarketCategories(pool: Pool) {
  const categories = [
    { name: 'Politics', slug: 'politics', color: '#3B82F6', icon: '🏛️' },
    { name: 'Crypto', slug: 'crypto', color: '#F59E0B', icon: '₿' },
    { name: 'Sports', slug: 'sports', color: '#10B981', icon: '⚽' },
    { name: 'Pop Culture', slug: 'pop-culture', color: '#EC4899', icon: '🎬' },
    { name: 'Science', slug: 'science', color: '#8B5CF6', icon: '🔬' },
    { name: 'Economics', slug: 'economics', color: '#EF4444', icon: '📈' },
  ];

  for (const cat of categories) {
    await pool.query(`
      INSERT INTO category (name, slug, color, icon)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING
    `, [cat.name, cat.slug, cat.color, cat.icon]);
  }
}

async function handleEventTaxonomy(client: any, eventId: string, category: string, tags: string[]) {
  // Handle category
  if (category) {
    const { rows: cats } = await client.query(
      'SELECT id FROM category WHERE slug = $1',
      [category.toLowerCase().replace(/\s+/g, '-')]
    );
    
    if (cats.length > 0) {
      await client.query(`
        INSERT INTO event_category (event_id, category_id, is_primary)
        VALUES ($1, $2, true)
        ON CONFLICT DO NOTHING
      `, [eventId, cats[0].id]);
    }
  }

  // Handle tags
  for (const tagName of tags) {
    // Ensure tag exists
    const { rows: [tag] } = await client.query(`
      INSERT INTO tag (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [tagName, tagName.toLowerCase().replace(/\s+/g, '-')]);

    // Link to event
    await client.query(`
      INSERT INTO event_tag (event_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [eventId, tag.id]);
  }
}