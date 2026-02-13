import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function fetchTrendingTopics() {
  try {
    // Use xapi to get Twitter trending topics
    const { stdout } = await execAsync('mcporter call xapi twitter.getTrending');
    const response = JSON.parse(stdout);
    
    if (response.success && response.data) {
      // Extract relevant trends
      return response.data.slice(0, 10).map(trend => ({
        name: trend.name,
        tweetVolume: trend.tweet_volume || 0,
        category: 'Twitter Trend',
        source: 'Twitter'
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Twitter trends:', error.message);
    // Fallback data for POC
    return getExampleEvents();
  }
}

export async function fetchUpcomingEvents() {
  // For POC, return hardcoded major events
  // Later we can integrate news APIs, sports calendars, etc.
  return [
    {
      name: 'Super Bowl 2024',
      date: '2024-02-11',
      category: 'Sports',
      source: 'Manual'
    },
    {
      name: 'Bitcoin Halving',
      date: '2024-04-20',
      category: 'Crypto',
      source: 'Manual'
    },
    {
      name: '2024 US Presidential Election',
      date: '2024-11-05',
      category: 'Politics',
      source: 'Manual'
    },
    {
      name: 'Paris Olympics',
      date: '2024-07-26',
      category: 'Sports',
      source: 'Manual'
    }
  ];
}

function getExampleEvents() {
  return [
    { name: 'Trump indictment', tweetVolume: 250000, category: 'Twitter Trend', source: 'Twitter' },
    { name: 'Bitcoin ETF', tweetVolume: 180000, category: 'Twitter Trend', source: 'Twitter' },
    { name: 'Fed rate decision', tweetVolume: 95000, category: 'Twitter Trend', source: 'Twitter' },
    { name: 'OpenAI announcement', tweetVolume: 120000, category: 'Twitter Trend', source: 'Twitter' }
  ];
}

// Test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Fetching trending topics...');
  const trends = await fetchTrendingTopics();
  console.log('Trending:', trends.slice(0, 5));
  
  console.log('\nFetching upcoming events...');
  const events = await fetchUpcomingEvents();
  console.log('Events:', events.slice(0, 5));
}