import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchActiveMarkets } from './src/polymarket-v2.js';
import { fetchTrendingTopics, fetchUpcomingEvents } from './src/events.js';
import { generateCalendar } from './src/index.js';
import { generateComprehensiveCalendar } from './src/index-v2.js';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from output directory
app.use(express.static(join(__dirname, 'output')));

// API endpoint to trigger manual refresh
app.get('/api/refresh', async (req, res) => {
  try {
    // Run both basic and comprehensive generation
    await generateCalendar();
    await generateComprehensiveCalendar();
    res.json({ success: true, message: 'Calendar updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for raw data
app.get('/api/data', async (req, res) => {
  try {
    const markets = await fetchActiveMarkets();
    const trends = await fetchTrendingTopics();
    const events = await fetchUpcomingEvents();
    
    res.json({
      markets: markets.slice(0, 20),
      trends,
      events,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comprehensive calendar endpoint
app.get('/comprehensive', (req, res) => {
  res.redirect('/calendar-comprehensive.html');
});

// Redirect root to comprehensive calendar
app.get('/', (req, res) => {
  res.redirect('/calendar-comprehensive.html');
});

// Generate initial calendar on startup
async function initialize() {
  console.log('🚀 Starting Prediction Market Calendar Server...');
  
  try {
    // Generate both versions on startup
    await generateCalendar();
    await generateComprehensiveCalendar();
    console.log('✅ Initial calendars generated');
  } catch (error) {
    console.error('⚠️  Failed to generate initial calendars:', error.message);
  }
  
  // Schedule hourly updates for basic calendar
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running hourly update...');
    try {
      await generateCalendar();
      console.log('✅ Hourly update complete');
    } catch (error) {
      console.error('❌ Hourly update failed:', error.message);
    }
  });
  
  // Schedule daily comprehensive updates at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running daily comprehensive update...');
    try {
      await generateComprehensiveCalendar();
      console.log('✅ Daily comprehensive update complete');
    } catch (error) {
      console.error('❌ Daily comprehensive update failed:', error.message);
    }
  });
  
  app.listen(PORT, () => {
    console.log(`📊 Server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the calendar`);
    console.log(`📈 Comprehensive view: http://localhost:${PORT}/comprehensive`);
  });
}

initialize();