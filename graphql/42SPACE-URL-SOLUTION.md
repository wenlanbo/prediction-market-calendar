# 42.space Market URL Solution

## ✅ Solved: How 42.space URLs Work

After analyzing the FortyTwo Protocol frontend code, I discovered that **42.space DOES use the market_address directly in URLs**, exactly as we expected:

### URL Pattern
```
https://42.space/event/{market_address}
```

### Evidence from Frontend Analysis

1. **In MarketTable component:**
```tsx
onRowClick={row => router.push(`/event/${row.marketAddress}`)}
```

2. **In MarketCard component:**
```tsx
const marketSlug = market.marketAddress
router.push(`/event/${marketSlug}`)
```

3. **The GraphQL query uses market_address:**
```graphql
query GetMarketDetail($marketAddress: String!) {
  home_market_list(
    where: { market_address: { _eq: $marketAddress } }
    limit: 1
  )
}
```

## Implementation

### 1. URL Generation Function
```typescript
// From graphql/utils/market-urls.ts
export const marketUrls = {
  '42space': (marketAddress: string) => {
    const address = marketAddress.startsWith('0x') ? marketAddress : `0x${marketAddress}`;
    return `https://42.space/event/${address}`;
  }
};
```

### 2. Sync Adapter for 42.space
Created `graphql/sync/fortytwo.ts` that:
- Fetches markets from 42.space GraphQL API
- Generates correct URLs using market_address
- Stores in our database with proper relationships

### 3. React Component
Created `graphql/components/MarketLink.tsx` that:
- Renders clickable links with correct URLs
- Shows formatted addresses (shortened)
- Handles multiple platforms

## Example Usage

### In GraphQL Query:
```graphql
query GetFortyTwoMarkets {
  event(where: { source: { slug: { _eq: "fortytwo" } } }) {
    id
    title
    external_id  # This is the market_address
    source_url   # Generated URL: https://42.space/event/{external_id}
    metadata {
      additional_info  # Contains question_id
    }
  }
}
```

### In React:
```tsx
import { MarketLink } from './components/MarketLink';

// Render a 42.space market link
<MarketLink
  platform="42space"
  marketId="0xCcF0379a3177bc7CC2257e7c02318327EF2A61De"
  showAddress={true}
/>
```

### Direct URL Construction:
```javascript
const marketAddress = "0xCcF0379a3177bc7CC2257e7c02318327EF2A61De";
const url = `https://42.space/event/${marketAddress}`;
// Result: https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De
```

## Verification

To verify this works:
1. Take any market_address from their GraphQL API
2. Construct URL: `https://42.space/event/{market_address}`
3. It should load the correct market page

## Additional Notes

- The market_address is the smart contract address on BSC (Binance Smart Chain)
- It's always a 42-character string starting with "0x"
- The same address is used for both API queries and URL construction
- No transformation or mapping is needed - use it directly

## Integration with Calendar

The prediction market calendar now:
1. Stores market_address as external_id
2. Generates proper 42.space URLs during sync
3. Displays clickable links in the UI
4. Supports searching by market address

This solves the URL mystery - there's no hidden mapping, just use the market_address directly!