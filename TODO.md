# TODO / Future Improvements

## High Priority

### 42.space URL Mapping Issue
- **Problem**: GraphQL API returns `market_address` that doesn't match the URL structure
- **Example**: 
  - API returns: `0xCcF0379a3177bc7CC2257e7c02318327EF2A61De`
  - Working URL uses: `0x0842630d678d74B7E7Bb6C14091a85836229A048`
- **Potential Solutions**:
  1. Contact 42.space team to understand URL structure
  2. Check if there's a different API endpoint that provides correct URLs
  3. Scrape 42.space website to build a mapping table
  4. Look for event_id or other fields that might map correctly

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