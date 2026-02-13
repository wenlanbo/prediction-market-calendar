# TODO / Future Improvements

## High Priority

### ✅ SOLVED: 42.space URL Mapping
- **Solution Found**: 42.space uses market_address directly in URLs!
- **URL Pattern**: `https://42.space/event/{market_address}`
- **Example**: `https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De`
- **Implementation Complete**:
  1. Created URL generator in `graphql/utils/market-urls.ts`
  2. Built FortyTwo sync adapter in `graphql/sync/fortytwo.ts`
  3. Added MarketLink component in `graphql/components/MarketLink.tsx`
  4. Full documentation in `graphql/42SPACE-URL-SOLUTION.md`

### Other Improvements
- Add more event sources (news APIs, sports calendars)
- Implement user preferences/filtering
- Add email notifications for matched events
- Create browser extension for quick access
- Add historical data tracking

## Medium Priority
- Improve matching algorithm with ML/embeddings
- Add more prediction market platforms
- Create mobile app version
- Add RSS/webhook endpoints

## Low Priority
- Add data visualization/charts
- Implement user accounts
- Add commenting system for markets