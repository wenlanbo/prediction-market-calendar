# Migration Guide: From REST to GraphQL

This guide explains how to migrate the Prediction Market Calendar from the current REST-based implementation to the new GraphQL-powered version with Hasura.

## Why Migrate?

The new GraphQL implementation offers:
- **Real-time updates** via subscriptions
- **Rich relational queries** with categories, tags, and metadata
- **Better performance** with query optimization and caching
- **Scalable architecture** using Hasura's automatic API generation
- **Historical tracking** with price history and audit logs
- **Multi-source support** for different prediction markets
- **Role-based access control** for future user features

## Key Improvements from Admin Dashboard Patterns

1. **Database Schema**
   - Proper normalization with categories, subcategories, and topics
   - Event metadata separation for flexibility
   - Price history tracking for charts
   - Audit trails with sync_log table

2. **GraphQL API**
   - Backend-for-Frontend (BFF) pattern with JWT generation
   - Hasura for automatic GraphQL API from database
   - Real-time subscriptions for live updates
   - Custom actions for complex operations

3. **Event Syncing**
   - Source-agnostic design (easy to add new markets)
   - Incremental updates with change detection
   - Automated scheduling with cron triggers
   - Error handling and retry logic

## Architecture Changes

### Before (Current):
```
Client → Express Server → Polymarket API
                      ↓
                Static HTML files
```

### After (GraphQL):
```
Client → GraphQL Endpoint → Hasura → PostgreSQL
           ↑                    ↓
      Express BFF          Event Sources
           ↓
      Sync Workers
```

## Migration Steps

### 1. Set Up Infrastructure

```bash
cd prediction-market-calendar/graphql

# Copy environment template
cp ../.env.example .env

# Add new environment variables:
cat >> .env << EOF
DATABASE_URL=postgres://postgres:postgres@localhost:5432/prediction_calendar
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecretkey
HASURA_WEBHOOK_SECRET=mywebhooksecret
JWT_SECRET=your-super-secret-key-min-32-characters-long
EOF

# Start services
docker-compose up -d
```

### 2. Initialize Database

The schema will be automatically applied when PostgreSQL starts. To verify:

```bash
# Check if tables are created
docker exec -it graphql_postgres_1 psql -U postgres -d prediction_calendar -c "\dt"
```

### 3. Apply Hasura Metadata

```bash
# Install Hasura CLI
npm install -g hasura-cli

# Apply metadata
hasura metadata apply --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

### 4. Seed Initial Data

```bash
# Add event sources
curl -X POST http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { insert_event_source(objects: [{name: \"Polymarket\", slug: \"polymarket\", api_type: \"polymarket\", base_url: \"https://gamma-api.polymarket.com\"}]) { returning { id } } }"
  }'

# Run initial sync
npm run sync
```

### 5. Migrate Existing Features

#### Calendar Generation
- **Before**: Static HTML generation in `generateComprehensiveCalendar()`
- **After**: Dynamic React component with `EventCalendar.tsx`

#### Data Fetching
- **Before**: Direct API calls in `fetchActiveMarkets()`
- **After**: GraphQL queries with caching and subscriptions

#### Event Updates
- **Before**: Hourly cron job regenerating all HTML
- **After**: Real-time subscriptions + incremental syncs

### 6. Update Client Code

Replace REST API calls with GraphQL queries:

```javascript
// Before
const markets = await fetch('/api/data').then(r => r.json());

// After
import { gql, useQuery } from '@apollo/client';

const GET_EVENTS = gql`
  query GetEvents {
    event(where: { status: { _eq: "active" } }) {
      id
      title
      probability
      volume
      end_date
    }
  }
`;

const { data, loading, error } = useQuery(GET_EVENTS);
```

### 7. Set Up Production Deployment

For Railway deployment:

```bash
# Update railway.json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "graphql/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Data Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `market.question` | `event.title` | Same content |
| `market.outcomes` | `outcome` table | Normalized with metadata |
| `market.volume` | `event.volume` | Converted from wei |
| `market.endDate` | `event.end_date` | Timestamp format |
| N/A | `event.categories` | New feature |
| N/A | `price_history` | New tracking |

## API Comparison

### Getting Active Markets

**REST (Old):**
```javascript
GET /api/data
{
  "markets": [...],
  "lastUpdated": "2024-01-15T..."
}
```

**GraphQL (New):**
```graphql
query {
  event(where: { status: { _eq: "active" } }) {
    id
    title
    probability
    volume
    categories {
      category { name, color }
    }
  }
}
```

### Real-time Updates

**REST (Old):** Not available

**GraphQL (New):**
```graphql
subscription WatchEvents {
  event(where: { status: { _eq: "active" } }) {
    id
    probability
    volume
    updated_at
  }
}
```

## Testing the Migration

1. **Verify Data Import**
   ```bash
   # Check event count
   curl -X POST http://localhost:8080/v1/graphql \
     -H "x-hasura-admin-secret: myadminsecretkey" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { event_aggregate { aggregate { count } } }"}'
   ```

2. **Test Real-time Updates**
   - Open Hasura Console: http://localhost:8080
   - Run a subscription query
   - Update an event's probability
   - Verify the subscription receives the update

3. **Performance Comparison**
   - Old: Full HTML regeneration every hour
   - New: Incremental updates, cached queries

## Rollback Plan

If issues arise:
1. Keep the old system running in parallel initially
2. Use feature flags to switch between implementations
3. Database backup before migration: `pg_dump`
4. Quick revert: `docker-compose down && git checkout main`

## Future Enhancements

With the GraphQL foundation, you can now add:
- User accounts and personalized calendars
- Email/SMS notifications for price changes
- Advanced filtering and search
- Historical analysis and trends
- Integration with more prediction markets
- Mobile app with offline support

## Support

- Hasura Documentation: https://hasura.io/docs/
- GraphQL Best Practices: https://graphql.org/learn/best-practices/
- Example queries: See `graphql/example-queries.graphql`