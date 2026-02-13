# 42.space Data Flow Summary

## Data Flow Diagram:

```
42.space GraphQL API (https://dev-api.42.space/v1/graphql)
    |
    v
home_market_list table (best data source)
    |
    v
JavaScript fetch42Markets() function
    |
    v
Data transformation:
  - Parse outcomes JSON
  - Convert volume strings to numbers  
  - Format timestamps
  - Calculate prices as percentages
  - Generate (broken) URL
    |
    v
Calendar display with inline data
```

## Key Findings:

1. **home_market_list** is the best data source because it has:
   - All market info in one place
   - Outcomes with prices
   - Volume and trader counts
   - Categories and status

2. **The URL Problem**: 
   - API returns: `market_address = 0xCcF0379a3177bc7CC2257e7c02318327EF2A61De`
   - Working URL needs: `0x0842630d678d74B7E7Bb6C14091a85836229A048`
   - This URL identifier doesn't exist ANYWHERE in their GraphQL API

3. **What we checked**:
   - ❌ market.address
   - ❌ question.id  
   - ❌ question_id
   - ❌ event_id
   - ❌ question_proposer
   - ❌ question_metadata
   - ❌ Any other table

## Solution Implemented:

Since we can't generate correct URLs, we:
1. Show all market data inline in the calendar
2. Display the market title and contract address
3. Tell users to search manually on 42.space
4. Include outcomes and prices so users don't need to visit 42.space

## Code Structure:

```
prediction-market-calendar/
├── src/
│   ├── 42markets.js         # Fetches data from GraphQL API
│   ├── index-v2.js          # Processes and displays data
│   └── market-utils.js      # Helper functions
└── output/
    └── calendar-comprehensive.html  # Final output
```