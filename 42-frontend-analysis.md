# 42.space Frontend Analysis

## How URLs are constructed in their code:

1. **In MarketTable component:**
```tsx
onRowClick={row => router.push(`/event/${row.marketAddress}`)}
```

2. **In MarketCard component:**
```tsx
const marketSlug = market.marketAddress
router.push(`/event/${marketSlug}`)
```

3. **In various portfolio components:**
```tsx
href={`/event/${marketAddress}`}
```

## The route structure:
- URL pattern: `/event/[id]`
- The `[id]` parameter is the `market_address` from the API

## In the market detail page:
```tsx
// app/event/[id]/page.tsx
const MarketDetailPage = () => {
  const params = useParams()
  const id = params?.id ?? ''  // This is the market_address
  return <MarketDetail id={id as string} />
}
```

## The query uses market_address:
```graphql
query GetMarketDetail($marketAddress: String!) {
  home_market_list(
    where: { market_address: { _eq: $marketAddress } }
    limit: 1
  )
}
```

## CONCLUSION:
The frontend IS using `market_address` for URLs, exactly like we're trying to do!

So either:
1. The URL you gave me (`0x0842630d678d74B7E7Bb6C14091a85836229A048`) is from a different market
2. There's URL rewriting happening on their server
3. The deployed version differs from this code