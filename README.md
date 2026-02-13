# Prediction Market Calendar 📊📅

A comprehensive tool that aggregates major events and trending topics, then intelligently maps them to active prediction markets on platforms like Polymarket and 42.space.

## Features

- **Multi-Platform Support**: Integrates both Polymarket and 42.space markets
- **Comprehensive Event Database**: 2025 major events across politics, sports, tech, crypto, and more
- **Smart Matching Algorithm**: AI-powered relevance scoring between events and markets
- **Multiple Output Formats**: HTML (web), Markdown (agents), and JSON (API)
- **Real-time Data**: Live market data including volume, liquidity, odds, and trader counts
- **Automatic Updates**: Hourly basic updates + daily comprehensive refreshes

## Quick Start

```bash
# Install dependencies
npm install

# Run the server
npm start

# Visit http://localhost:3000 for the comprehensive calendar
```

## API Endpoints

- `/` - Comprehensive calendar view (default)
- `/calendar.html` - Basic calendar view
- `/comprehensive` - Comprehensive calendar with all features
- `/calendar-comprehensive.md` - Agent-readable format
- `/api/refresh` - Trigger manual update
- `/api/data` - Raw JSON data for integrations

## Project Structure

```
├── src/
│   ├── index.js          # Main orchestrator
│   ├── polymarket-v2.js  # Market data fetcher
│   └── events.js         # Event/trend fetcher
├── output/
│   ├── calendar.html     # Web-viewable calendar
│   └── calendar.md       # Agent-readable format
└── package.json
```

## API Integrations

### Active Integrations:
- **Polymarket**: Multiple endpoints (CLOB, Gamma, Strapi) for comprehensive data
- **42.space**: GraphQL API for all active markets with volume, traders, and outcomes
- **Major Events**: Curated database of 2025 significant events
- **Twitter/X trends**: Via bird CLI (when available)

### Data Sources:
- Politics: Elections, policy decisions, political events
- Sports: Super Bowl, NBA Finals, World Cup, Olympics
- Crypto: Bitcoin halving anniversary, Ethereum upgrades, token launches
- Technology: Apple WWDC, Google I/O, AI model releases
- Economics: Fed decisions, recession indicators

## Development

```bash
# Run in development mode with auto-reload
npm run dev
```

## Deployment

This project is designed to run on Railway with automatic updates via cron jobs.

### Deploy to Railway

1. Fork or use this repository
2. Connect your GitHub account to Railway
3. Create a new project and select this repository
4. Railway will automatically detect the configuration and deploy
5. The app will generate calendars on startup and refresh hourly

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/wenlanbo/prediction-market-calendar)

### Environment Variables

The following environment variables can be configured in Railway:

- `PORT` - Server port (Railway provides this automatically)
- `POLYMARKET_API_KEY` - (Optional) For enhanced API access
- `TWITTER_API_KEY` - (Optional) For real Twitter data
- `REFRESH_INTERVAL` - (Optional) Cron schedule for updates (default: hourly)

## Contributing

Feel free to open issues or submit PRs for new event sources, better matching algorithms, or UI improvements!

## License

MIT