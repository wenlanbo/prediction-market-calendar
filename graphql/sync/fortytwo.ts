import { GraphQLClient } from 'graphql-request';
import { Pool } from 'pg';
import { getMarketUrl } from '../utils/market-urls.js';

const FORTYTWO_GRAPHQL_ENDPOINT = process.env.FORTYTWO_GRAPHQL_ENDPOINT || 
  'https://api.42.space/v1/graphql'; // Replace with actual endpoint

interface FortyTwoMarket {
  market_address: string;
  question: string;
  question_id: string;
  status: string;
  volume: string;
  liquidity: string;
  resolved_outcome?: string;
  outcomes: Array<{
    outcome_id: string;
    name: string;
    probability?: number;
  }>;
  resolution_timestamp?: string;
  created_at: string;
  updated_at: string;
  category?: string;
  tags?: string[];
}

const FORTYTWO_MARKETS_QUERY = `
  query GetActiveMarkets($limit: Int!, $offset: Int!) {
    home_market_list(
      where: { status: { _in: ["active", "pending"] } }
      limit: $limit
      offset: $offset
      order_by: { volume: desc }
    ) {
      market_address
      question
      question_id
      status
      volume
      liquidity
      resolved_outcome
      outcomes
      resolution_timestamp
      created_at
      updated_at
    }
  }
`;

export async function syncFortyTwoEvents(source: any, pool: Pool) {
  console.log('Syncing 42.space (FortyTwo Protocol) events...');
  
  const client = new GraphQLClient(FORTYTWO_GRAPHQL_ENDPOINT);
  let processed = 0;
  let added = 0;
  let updated = 0;
  let offset = 0;
  const limit = 50;

  // Ensure we have FortyTwo categories
  await ensureFortyTwoCategories(pool);

  while (true) {
    try {
      const data: any = await client.request(FORTYTWO_MARKETS_QUERY, {
        limit: limit,
        offset: offset,
      });

      if (!data.home_market_list || data.home_market_list.length === 0) break;

      for (const market of data.home_market_list) {
        processed++;
        
        // Check if event exists
        const { rows: existing } = await pool.query(
          'SELECT id, volume FROM event WHERE source_id = $1 AND external_id = $2',
          [source.id, market.market_address]
        );

        const marketData = transformFortyTwoData(market);
        
        if (existing.length === 0) {
          // Insert new event
          await insertEvent(pool, source.id, marketData);
          added++;
        } else {
          // Update existing event if volume changed
          const existingEvent = existing[0];
          if (shouldUpdateEvent(existingEvent, marketData)) {
            await updateEvent(pool, existingEvent.id, marketData);
            updated++;
          }
        }
      }

      offset += limit;
      
      // Limit total markets to sync
      if (processed >= 200) break;
      
    } catch (error) {
      console.error('Error fetching 42.space data:', error);
      throw error;
    }
  }

  console.log(`42.space sync complete: ${processed} processed, ${added} added, ${updated} updated`);
  return { processed, added, updated };
}

function transformFortyTwoData(market: FortyTwoMarket): any {
  // Calculate probability from outcomes if available
  let probability = null;
  if (market.outcomes && market.outcomes.length > 0) {
    const yesOutcome = market.outcomes.find(o => 
      o.name.toLowerCase() === 'yes' || 
      o.outcome_id === '1'
    );
    if (yesOutcome && yesOutcome.probability) {
      probability = yesOutcome.probability;
    }
  }

  // Parse volume and liquidity (assuming they're in wei or similar)
  const volume = parseFloat(market.volume || '0');
  const liquidity = parseFloat(market.liquidity || '0');

  // Generate the correct 42.space URL
  const sourceUrl = getMarketUrl('42space', market.market_address);

  return {
    external_id: market.market_address,
    title: market.question,
    slug: market.market_address.toLowerCase(),
    description: market.question, // FortyTwo doesn't seem to have separate descriptions
    end_date: market.resolution_timestamp || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days if no resolution timestamp
    probability,
    volume,
    liquidity,
    source_url: sourceUrl,
    status: market.status,
    question_id: market.question_id,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'prediction')
      RETURNING id
    `, [
      sourceId, data.external_id, data.title, data.slug, data.description,
      data.end_date, data.probability, data.volume, data.liquidity, data.source_url,
      data.status === 'active' ? 'active' : 'draft',
    ]);

    // Insert metadata with question_id
    await client.query(`
      INSERT INTO event_metadata (event_id, additional_info)
      VALUES ($1, $2)
    `, [event.id, JSON.stringify({ 
      question_id: data.question_id,
      market_address: data.external_id,
      platform: '42space'
    })]);

    // Insert outcomes
    for (let i = 0; i < data.outcomes.length; i++) {
      const outcome = data.outcomes[i];
      const { rows: [outcomeRow] } = await client.query(`
        INSERT INTO outcome (event_id, name, probability, display_order)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        event.id, 
        outcome.name, 
        outcome.probability || null, 
        i
      ]);

      // Add outcome metadata
      await client.query(`
        INSERT INTO outcome_metadata (outcome_id, symbol, additional_info)
        VALUES ($1, $2, $3)
      `, [
        outcomeRow.id, 
        outcome.name.substring(0, 10).toUpperCase(),
        JSON.stringify({ outcome_id: outcome.outcome_id })
      ]);
    }

    // Add default category (you might want to parse from the market data if available)
    await handleEventTaxonomy(client, event.id, 'general', []);

    // Add initial price history if probability exists
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
        volume = $2,
        liquidity = $3,
        source_url = $4,
        updated_at = NOW()
      WHERE id = $1
    `, [eventId, data.volume, data.liquidity, data.source_url]);

    // Update outcomes if probabilities changed
    if (data.outcomes && data.outcomes.length > 0) {
      for (const outcome of data.outcomes) {
        if (outcome.probability !== undefined) {
          await client.query(`
            UPDATE outcome 
            SET probability = $3
            WHERE event_id = $1 AND name = $2
          `, [eventId, outcome.name, outcome.probability]);
        }
      }
    }

    // Add to price history if we have probability
    if (data.probability) {
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
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function shouldUpdateEvent(existing: any, newData: any): boolean {
  // Always update if volume increased significantly
  if (newData.volume > existing.volume * 1.05) {
    return true;
  }
  
  return false;
}

async function ensureFortyTwoCategories(pool: Pool) {
  const categories = [
    { name: 'General', slug: 'general', color: '#6B7280', icon: '🔮' },
    { name: 'Politics', slug: 'politics', color: '#3B82F6', icon: '🏛️' },
    { name: 'Crypto', slug: 'crypto', color: '#F59E0B', icon: '₿' },
    { name: 'Sports', slug: 'sports', color: '#10B981', icon: '⚽' },
    { name: 'Entertainment', slug: 'entertainment', color: '#EC4899', icon: '🎬' },
    { name: 'Technology', slug: 'technology', color: '#8B5CF6', icon: '💻' },
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
  const categorySlug = category ? category.toLowerCase().replace(/\s+/g, '-') : 'general';
  const { rows: cats } = await client.query(
    'SELECT id FROM category WHERE slug = $1',
    [categorySlug]
  );
  
  if (cats.length > 0) {
    await client.query(`
      INSERT INTO event_category (event_id, category_id, is_primary)
      VALUES ($1, $2, true)
      ON CONFLICT DO NOTHING
    `, [eventId, cats[0].id]);
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