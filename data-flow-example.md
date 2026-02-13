# 42.space Data Flow Example

## 1. Raw Data from API:
- **market_address**: `0xCcF0379a3177bc7CC2257e7c02318327EF2A61De` (This is what API returns)
- **question_id**: `0xd549841b096d2b4de00ccf8c22c4b7bc93343a50a2d9206a011914aba630481d`
- **total_volume_hmr**: `"98532.260123556901780600"` (string with high precision)
- **outcomes**: JSON array with detailed outcome data including prices

## 2. Data Transformation in Code:
```javascript
// Convert volume from string to number
volume: parseFloat(m.total_volume_hmr || 0)
// Result: 98532.26

// Parse outcomes JSON 
outcomes = Array.isArray(m.outcomes) ? m.outcomes : Object.values(m.outcomes)
// Result: Array of outcome objects with prices, names, etc.

// Convert timestamps
endDate: m.current_end_timestamp_tz || new Date(m.current_end_timestamp * 1000).toISOString()
// Result: "2026-12-30T23:59:00+00:00"

// Generate URL (this is where the problem occurs!)
url: `https://www.42.space/event/${m.market_address}`
// Result: https://www.42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De
// BUT the actual working URL is: https://www.42.space/event/0x0842630d678d74B7E7Bb6C14091a85836229A048
```

## 3. The URL Problem:
The API returns `market_address` but 42.space URLs use a DIFFERENT identifier that isn't available in the API:
- API gives us: `0xCcF0379a3177bc7CC2257e7c02318327EF2A61De`
- URL needs: `0x0842630d678d74B7E7Bb6C14091a85836229A048`
- No field in the API contains this URL identifier!

## 4. Data Fields Available:
- `market_address` - Contract address (not the URL ID)
- `question_id` - Different hex value (not the URL ID)
- `category_id` - Just a number like "2"
- `traders` - Number of traders
- `outcomes` - Array of possible outcomes with prices
- `status` - Market status (live, finalised, etc.)
- NO field contains the URL identifier!