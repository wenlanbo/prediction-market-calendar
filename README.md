# Prediction Market Calendar 📊📅

A tool that aggregates major events and trending topics, then maps them to active prediction markets on platforms like Polymarket and 42.

## Features

- **Event Discovery**: Fetches trending topics from Twitter/X and tracks major upcoming events
- **Market Mapping**: Automatically matches events to relevant prediction markets
- **Dual Output**: Generates both HTML for web viewing and Markdown for AI agents
- **Real-time Data**: Pulls live market data including volume, liquidity, and odds

## Quick Start

```bash
# Install dependencies
npm install

# Run the calendar generator
npm start

# Output will be in output/calendar.html and output/calendar.md
```

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

Currently supports:
- Polymarket (via CLOB API)
- Twitter/X trends (via xapi)
- Manual event entries

Future integrations:
- 42 prediction market database
- News APIs for automatic event detection
- Sports calendars
- Economic calendars

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