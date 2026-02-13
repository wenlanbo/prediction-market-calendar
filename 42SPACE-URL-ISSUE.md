# 42.space URL Mapping Issue

## The Problem

42.space has a **critical API-to-URL mapping issue**:
- Their GraphQL API returns `market_address` (e.g., `0xCcF0379a3177bc7CC2257e7c02318327EF2A61De`)
- But their URLs require a **different identifier** that is NOT available in the API
- When you visit `https://42.space/event/{market_address}`, the page loads but shows a generic page, NOT the specific market

## Evidence

1. **API Returns:**
   ```
   market_address: 0xCcF0379a3177bc7CC2257e7c02318327EF2A61De
   ```

2. **URL Test Results:**
   - `https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De` → Returns 200 OK but shows generic page
   - Page title: "42 — Trade the Future" (not the market title)
   - No market-specific content loaded

3. **Working URLs use different addresses:**
   - Example: `https://42.space/event/0x0842630d678d74B7E7Bb6C14091a85836229A048`
   - This address is NOT found anywhere in their API

## Root Cause

42.space appears to have two different contract systems:
1. **Market contracts** (returned by API) - The actual smart contracts for markets
2. **URL identifiers** (used in frontend) - Different contracts or proxy addresses

Their frontend expects the URL identifier, but their API only provides market contracts.

## Current Workaround

Since we can't generate correct direct URLs, we use search:
```javascript
searchUrl: `https://42.space/search?q=${encodeURIComponent(marketTitle)}`
```

## What 42.space Needs to Fix

1. Add a `url_slug` or `event_id` field to their API that matches their URL structure
2. OR expose the URL identifier mapping in their API
3. OR make their frontend work with market_address

## For Users

Until 42.space fixes this:
1. Click "Search on 42.space" 
2. The market title will be pre-filled in search
3. Click on the correct market from search results

## Technical Details

Their frontend is a Next.js app that likely:
1. Takes the URL parameter
2. Queries a different internal API or mapping table
3. That mapping is not exposed in their public GraphQL API

This is why all market_address URLs return 200 OK but don't show the correct content - the frontend can't resolve the market_address to the internal identifier it needs.