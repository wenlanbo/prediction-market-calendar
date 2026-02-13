import express from 'express';
import { GraphQLClient } from 'graphql-request';
import * as jose from 'jose';
import { Pool } from 'pg';
import cron from 'node-cron';

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-min-32-characters-long';
const JWT_TTL_SECONDS = 300; // 5 minutes

interface HasuraClaims {
  'x-hasura-user-id': string;
  'x-hasura-default-role': string;
  'x-hasura-allowed-roles': string[];
  'x-hasura-user-email'?: string;
}

// Generate Hasura JWT
async function generateHasuraJWT(userId: string, role: string = 'anonymous'): Promise<string> {
  const hasuraClaims: HasuraClaims = {
    'x-hasura-user-id': userId,
    'x-hasura-default-role': role,
    'x-hasura-allowed-roles': [role, 'anonymous'],
  };

  const secretKey = new TextEncoder().encode(JWT_SECRET);
  const jwt = await new jose.SignJWT({
    'https://hasura.io/jwt/claims': hasuraClaims,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .setSubject(userId)
    .sign(secretKey);

  return jwt;
}

// GraphQL proxy endpoint
app.post('/api/graphql', async (req, res) => {
  const hasuraEndpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
  if (!hasuraEndpoint) {
    return res.status(500).json({
      errors: [{ message: 'HASURA_GRAPHQL_ENDPOINT is not configured' }],
    });
  }

  // For now, use anonymous access
  // In production, implement proper authentication
  const userId = 'anonymous';
  const role = 'anonymous';

  let hasuraToken: string;
  try {
    hasuraToken = await generateHasuraJWT(userId, role);
  } catch (error) {
    console.error('Failed to generate Hasura JWT:', error);
    return res.status(500).json({
      errors: [{ message: 'Failed to generate authorization token' }],
    });
  }

  // Forward request to Hasura
  try {
    const hasuraResponse = await fetch(hasuraEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hasuraToken}`,
      },
      body: JSON.stringify(req.body),
    });

    const responseData = await hasuraResponse.json();
    return res.status(hasuraResponse.status).json(responseData);
  } catch (error) {
    console.error('Failed to proxy request to Hasura:', error);
    return res.status(502).json({
      errors: [{ message: 'Failed to communicate with GraphQL server' }],
    });
  }
});

// Webhook endpoint for Hasura events
app.post('/api/webhooks/hasura', async (req, res) => {
  // Validate webhook secret
  const webhookSecret = req.headers['x-hasura-webhook-secret'];
  const expectedSecret = process.env.HASURA_WEBHOOK_SECRET;

  if (!expectedSecret || webhookSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const payload = req.body;

  // Handle different webhook types
  if (payload.trigger) {
    // Event trigger
    const triggerName = payload.trigger.name;
    console.log(`Received event trigger: ${triggerName}`);

    switch (triggerName) {
      case 'event_probability_change':
        await handleProbabilityChange(payload);
        break;
      case 'new_high_volume_event':
        await handleNewHighVolumeEvent(payload);
        break;
      default:
        console.log(`Unknown trigger: ${triggerName}`);
    }
  } else if (payload.scheduled_time) {
    // Cron trigger
    const type = payload.payload?.type;
    console.log(`Received cron trigger: ${type}`);

    switch (type) {
      case 'sync_all_sources':
        await syncAllSources();
        break;
      case 'cleanup_price_history':
        await cleanupPriceHistory(payload.payload.days_to_keep || 30);
        break;
      default:
        console.log(`Unknown cron type: ${type}`);
    }
  }

  res.json({ success: true });
});

// Action handler for syncing event sources
app.post('/api/actions/sync-source', async (req, res) => {
  const { source_id } = req.body.input;

  try {
    const result = await syncEventSource(source_id);
    res.json({
      events_processed: result.eventsProcessed,
      events_added: result.eventsAdded,
      events_updated: result.eventsUpdated,
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function handleProbabilityChange(payload: any) {
  const newData = payload.event.data.new;
  const oldData = payload.event.data.old;
  
  // Check for significant changes (>5%)
  if (Math.abs(newData.probability - oldData.probability) > 0.05) {
    console.log(`Significant probability change for event ${newData.id}:`, 
      `${oldData.probability} -> ${newData.probability}`);
    
    // Add to price history
    await pool.query(`
      INSERT INTO price_history (event_id, timestamp, price, volume_24h)
      VALUES ($1, NOW(), $2, $3)
    `, [newData.id, newData.probability, newData.volume]);
  }
}

async function handleNewHighVolumeEvent(payload: any) {
  const event = payload.event.data.new;
  
  if (event.volume > 100000) { // $100k+ volume
    console.log(`New high volume event: ${event.title} ($${event.volume})`);
    // Could send notifications, update featured events, etc.
  }
}

async function syncEventSource(sourceId: number) {
  console.log(`Syncing source ${sourceId}...`);
  
  // Log sync start
  const { rows: [syncLog] } = await pool.query(`
    INSERT INTO sync_log (source_id, sync_type, status, started_at)
    VALUES ($1, 'manual', 'started', NOW())
    RETURNING id
  `, [sourceId]);

  try {
    // Get source details
    const { rows: [source] } = await pool.query(
      'SELECT * FROM event_source WHERE id = $1',
      [sourceId]
    );

    let eventsProcessed = 0;
    let eventsAdded = 0;
    let eventsUpdated = 0;

    // Import appropriate fetcher based on api_type
    switch (source.api_type) {
      case 'polymarket':
        const { syncPolymarketEvents } = await import('./sync/polymarket.js');
        const polyResult = await syncPolymarketEvents(source, pool);
        eventsProcessed = polyResult.processed;
        eventsAdded = polyResult.added;
        eventsUpdated = polyResult.updated;
        break;
      // Add other sources as needed
    }

    // Update sync log
    await pool.query(`
      UPDATE sync_log 
      SET status = 'completed',
          completed_at = NOW(),
          events_processed = $2,
          events_added = $3,
          events_updated = $4
      WHERE id = $1
    `, [syncLog.id, eventsProcessed, eventsAdded, eventsUpdated]);

    return { eventsProcessed, eventsAdded, eventsUpdated };
  } catch (error) {
    // Log error
    await pool.query(`
      UPDATE sync_log 
      SET status = 'failed',
          completed_at = NOW(),
          error_message = $2
      WHERE id = $1
    `, [syncLog.id, error.message]);
    
    throw error;
  }
}

async function syncAllSources() {
  console.log('Starting sync for all active sources...');
  
  const { rows: sources } = await pool.query(
    'SELECT id FROM event_source WHERE is_active = true'
  );
  
  for (const source of sources) {
    try {
      await syncEventSource(source.id);
    } catch (error) {
      console.error(`Failed to sync source ${source.id}:`, error);
    }
  }
}

async function cleanupPriceHistory(daysToKeep: number) {
  console.log(`Cleaning up price history older than ${daysToKeep} days...`);
  
  const result = await pool.query(`
    DELETE FROM price_history 
    WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
  `);
  
  console.log(`Deleted ${result.rowCount} old price history records`);
}

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 GraphQL calendar server running on port ${PORT}`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/api/graphql`);
});