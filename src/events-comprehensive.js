import axios from 'axios';
import { format, parse } from 'date-fns';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Major events for 2025
export async function fetchMajorEvents2025() {
  const currentYear = new Date().getFullYear();
  
  return [
    // Politics & Elections
    {
      name: 'Virginia Gubernatorial Election',
      date: '2025-11-04',
      category: 'Politics',
      subcategory: 'US Elections',
      description: 'Virginia elects a new governor',
      keywords: ['virginia', 'governor', 'election', 'glenn youngkin']
    },
    {
      name: 'UK Local Elections',
      date: '2025-05-01',
      category: 'Politics',
      subcategory: 'UK Elections',
      description: 'Local council elections across the UK',
      keywords: ['uk', 'local elections', 'council', 'labour', 'conservative']
    },
    {
      name: 'German Federal Election',
      date: '2025-09-28',
      category: 'Politics',
      subcategory: 'European Elections',
      description: 'Germany elects new Bundestag',
      keywords: ['germany', 'bundestag', 'election', 'scholz', 'cdu']
    },
    
    // Economics & Finance
    {
      name: 'Fed Rate Decision - Q1',
      date: '2025-03-19',
      category: 'Economics',
      subcategory: 'Central Banks',
      description: 'Federal Reserve interest rate decision',
      keywords: ['fed', 'interest rate', 'fomc', 'powell', 'inflation']
    },
    {
      name: 'Bitcoin Halving Anniversary',
      date: '2025-04-20',
      category: 'Crypto',
      subcategory: 'Bitcoin',
      description: '1 year since last Bitcoin halving',
      keywords: ['bitcoin', 'halving', 'btc', 'crypto']
    },
    {
      name: 'Ethereum Pectra Upgrade',
      date: '2025-03-01',
      category: 'Crypto',
      subcategory: 'Ethereum',
      description: 'Major Ethereum network upgrade',
      keywords: ['ethereum', 'pectra', 'eth', 'upgrade']
    },
    
    // Sports
    {
      name: 'Super Bowl LIX',
      date: '2025-02-09',
      category: 'Sports',
      subcategory: 'NFL',
      description: 'NFL Championship game in New Orleans',
      keywords: ['super bowl', 'nfl', 'football', 'championship']
    },
    {
      name: 'NBA Finals Start',
      date: '2025-06-05',
      category: 'Sports',
      subcategory: 'NBA',
      description: 'NBA Championship series begins',
      keywords: ['nba', 'finals', 'basketball', 'championship']
    },
    {
      name: 'Wimbledon Championships',
      date: '2025-06-30',
      category: 'Sports',
      subcategory: 'Tennis',
      description: 'Tennis Grand Slam at All England Club',
      keywords: ['wimbledon', 'tennis', 'grand slam']
    },
    {
      name: 'FIFA Club World Cup',
      date: '2025-06-15',
      category: 'Sports',
      subcategory: 'Soccer',
      description: 'Expanded 32-team tournament in USA',
      keywords: ['fifa', 'club world cup', 'soccer', 'football']
    },
    
    // Technology & AI
    {
      name: 'Apple WWDC 2025',
      date: '2025-06-02',
      category: 'Technology',
      subcategory: 'Apple',
      description: 'Apple Developer Conference - iOS 19, new products',
      keywords: ['apple', 'wwdc', 'ios', 'iphone', 'developer']
    },
    {
      name: 'Google I/O 2025',
      date: '2025-05-14',
      category: 'Technology',
      subcategory: 'Google',
      description: 'Google Developer Conference - Android 16, AI updates',
      keywords: ['google', 'io', 'android', 'ai', 'developer']
    },
    {
      name: 'Microsoft Build 2025',
      date: '2025-05-19',
      category: 'Technology',
      subcategory: 'Microsoft',
      description: 'Microsoft Developer Conference',
      keywords: ['microsoft', 'build', 'azure', 'windows', 'developer']
    },
    {
      name: 'GPT-5 Release Window',
      date: '2025-06-01',
      category: 'Technology',
      subcategory: 'AI',
      description: 'Expected GPT-5 release timeframe',
      keywords: ['gpt5', 'openai', 'chatgpt', 'ai', 'llm']
    },
    
    // Entertainment & Culture
    {
      name: 'Academy Awards (Oscars)',
      date: '2025-03-02',
      category: 'Entertainment',
      subcategory: 'Awards',
      description: '97th Academy Awards ceremony',
      keywords: ['oscars', 'academy awards', 'movies', 'hollywood']
    },
    {
      name: 'Cannes Film Festival',
      date: '2025-05-13',
      category: 'Entertainment',
      subcategory: 'Film',
      description: '78th Cannes Film Festival',
      keywords: ['cannes', 'film festival', 'movies', 'cinema']
    },
    {
      name: 'E3 Gaming Expo',
      date: '2025-06-10',
      category: 'Entertainment',
      subcategory: 'Gaming',
      description: 'Electronic Entertainment Expo',
      keywords: ['e3', 'gaming', 'xbox', 'playstation', 'nintendo']
    },
    
    // Science & Space
    {
      name: 'Artemis II Moon Mission',
      date: '2025-09-01',
      category: 'Science',
      subcategory: 'Space',
      description: 'NASA crewed lunar flyby mission',
      keywords: ['artemis', 'nasa', 'moon', 'space', 'astronaut']
    },
    {
      name: 'Total Solar Eclipse - Europe',
      date: '2025-08-12',
      category: 'Science',
      subcategory: 'Astronomy',
      description: 'Total solar eclipse visible in parts of Europe',
      keywords: ['solar eclipse', 'astronomy', 'europe']
    }
  ];
}

// Search for events related to a specific query
export async function searchRelatedEvents(query) {
  try {
    // You can integrate with news APIs here
    // For now, filter from our major events
    const majorEvents = await fetchMajorEvents2025();
    const queryLower = query.toLowerCase();
    
    return majorEvents.filter(event => {
      const searchText = `${event.name} ${event.description} ${event.keywords.join(' ')}`.toLowerCase();
      return searchText.includes(queryLower) || 
             event.keywords.some(keyword => queryLower.includes(keyword));
    });
  } catch (error) {
    console.error('Error searching events:', error.message);
    return [];
  }
}

// Fetch trending topics from multiple sources
export async function fetchTrendingTopicsComprehensive() {
  const trends = [];
  
  // Twitter/X trends (using bird CLI)
  try {
    const { stdout } = await execAsync('bird trends --json');
    const twitterTrends = JSON.parse(stdout);
    trends.push(...twitterTrends.map(t => ({
      name: t.name,
      volume: t.tweet_volume || 0,
      source: 'Twitter',
      category: 'Trending'
    })));
  } catch (error) {
    console.log('Twitter trends not available:', error.message);
  }
  
  // Google Trends (would need API key)
  // News API trends (would need API key)
  // Reddit trending (would need API)
  
  return trends;
}

// Categorize events automatically
export function categorizeEvent(eventName, description = '') {
  const text = `${eventName} ${description}`.toLowerCase();
  
  // Category mapping
  const categories = {
    'Politics': ['election', 'vote', 'president', 'governor', 'senate', 'congress', 'parliament'],
    'Sports': ['super bowl', 'world cup', 'olympics', 'championship', 'finals', 'nba', 'nfl', 'fifa'],
    'Crypto': ['bitcoin', 'ethereum', 'crypto', 'defi', 'nft', 'blockchain', 'halving'],
    'Technology': ['apple', 'google', 'microsoft', 'ai', 'gpt', 'launch', 'release'],
    'Economics': ['fed', 'interest rate', 'inflation', 'gdp', 'recession', 'earnings'],
    'Entertainment': ['oscars', 'grammys', 'movie', 'film', 'album', 'concert'],
    'Science': ['nasa', 'space', 'eclipse', 'discovery', 'research']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
}

// Test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Fetching major events for 2025...');
  const events = await fetchMajorEvents2025();
  console.log(`Found ${events.length} major events`);
  
  // Group by category
  const byCategory = {};
  events.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });
  
  Object.entries(byCategory).forEach(([cat, evts]) => {
    console.log(`\n${cat}: ${evts.length} events`);
    evts.slice(0, 3).forEach(e => console.log(`  - ${e.name} (${e.date})`));
  });
}