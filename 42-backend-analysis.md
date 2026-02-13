# 42.space Backend Analysis

## Key Findings:

### 1. Market Address Source
- Market addresses come directly from blockchain events
- When a market is created, the `CreateNewMarket` event provides the market address
- This address is stored in the `market` table without transformation
- The `home_market_list` view exposes `m.address AS market_address`

### 2. No URL Transformation Found
- No slug, permalink, or url_id fields in the database
- No proxy or routing logic that transforms addresses
- No resolver contracts or mapping tables
- The backend serves the raw market addresses as-is

### 3. Database Structure
```sql
-- From home_market_list view
SELECT 
    m.address AS market_address,  -- Direct from market table
    q.question_id,
    q.title,
    ...
FROM market m
```

### 4. Frontend Confirms Direct Usage
- Frontend routes to `/event/${marketAddress}`
- GraphQL queries use `market_address: { _eq: $marketAddress }`

## Conclusion:

Both the backend and frontend codebases confirm that:
1. Market addresses from the blockchain are used directly in URLs
2. There's NO transformation or mapping system
3. The URL structure should be: `/event/{market_address}`

## The Mystery Remains:

Why does the API return `0xCcF0379a3177bc7CC2257e7c02318327EF2A61De` but the working URL uses `0x0842630d678d74B7E7Bb6C14091a85836229A048`?

Possible explanations:
1. **Different environments**: The dev API has different data than production
2. **Multiple contracts**: There might be multiple market contracts for the same question
3. **Proxy contracts**: The URL address might be a proxy that forwards to the actual market
4. **Historical migration**: The URL might be from an older system that was migrated

Without access to the production GraphQL endpoint or the actual blockchain contracts, we cannot determine the exact mapping.