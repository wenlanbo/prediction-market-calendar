import { fetchActiveMarkets } from './polymarket-v2.js';
import { fetchTrendingTopics, fetchUpcomingEvents } from './events.js';
import { format, parseISO, isValid } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';

// Simple keyword matching for POC
function matchEventsToMarkets(events, markets) {
  const matches = [];
  
  for (const event of events) {
    for (const market of markets) {
      const eventKeywords = event.name.toLowerCase().split(/\s+/);
      const marketText = `${market.question} ${market.description}`.toLowerCase();
      
      // Check if any event keyword appears in market text
      const relevanceScore = eventKeywords.filter(keyword => 
        keyword.length > 3 && marketText.includes(keyword)
      ).length;
      
      if (relevanceScore > 0) {
        matches.push({
          event,
          market,
          relevanceScore,
          matchType: 'keyword'
        });
      }
    }
  }
  
  // Sort by relevance
  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function generateHTML(matches, events, markets) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Prediction Market Calendar</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .section { margin: 30px 0; }
        .match { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .market { background: #f3e5f5; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .event { background: #e8f5e9; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .volume { color: #666; font-size: 0.9em; }
        a { color: #1976d2; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .tag { display: inline-block; background: #ddd; padding: 2px 8px; margin: 2px; border-radius: 3px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Prediction Market Calendar</h1>
        <p>Last updated: ${new Date().toISOString()}</p>
        
        <div class="section">
            <h2>📊 Event → Market Matches</h2>
            ${matches.slice(0, 10).map(match => `
                <div class="match">
                    <h3>Event: ${match.event.name}</h3>
                    <p>Source: ${match.event.source} | Category: ${match.event.category}</p>
                    <div class="market">
                        <strong>Market:</strong> ${match.market.question}<br>
                        <span class="volume">Volume: $${match.market.volume.toLocaleString()}</span><br>
                        <a href="${match.market.url}" target="_blank">View on Polymarket →</a>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>🔥 All Trending Events</h2>
            ${events.filter(e => e.source === 'Twitter').map(event => `
                <div class="event">
                    <strong>${event.name}</strong>
                    ${event.tweetVolume ? `<span class="volume"> - ${event.tweetVolume.toLocaleString()} tweets</span>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>📅 Upcoming Major Events</h2>
            ${events.filter(e => e.date).map(event => `
                <div class="event">
                    <strong>${event.name}</strong> - ${event.date}
                    <span class="tag">${event.category}</span>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  
  return html;
}

function generateMarkdown(matches, events, markets) {
  const md = `# Prediction Market Calendar
Last updated: ${new Date().toISOString()}

## Event → Market Matches

${matches.slice(0, 10).map(match => `
### Event: ${match.event.name}
- **Source**: ${match.event.source}
- **Category**: ${match.event.category}
- **Matched Market**: ${match.market.question}
- **Market Volume**: $${match.market.volume.toLocaleString()}
- **[View on Polymarket](${match.market.url})**
`).join('\n---\n')}

## Trending Events (Twitter)
${events.filter(e => e.source === 'Twitter').map(e => 
  `- **${e.name}**${e.tweetVolume ? ` - ${e.tweetVolume.toLocaleString()} tweets` : ''}`
).join('\n')}

## Upcoming Major Events
${events.filter(e => e.date).map(e => 
  `- **${e.name}** - ${e.date} [${e.category}]`
).join('\n')}

## Active Prediction Markets
${markets.slice(0, 20).map(m => 
  `- **${m.question}** - Volume: $${m.volume.toLocaleString()}`
).join('\n')}
`;
  
  return md;
}

export async function generateCalendar() {
  console.log('🚀 Generating Prediction Market Calendar...\n');
  
  // Ensure output directory exists
  await fs.mkdir('output', { recursive: true });
  
  // Fetch data
  console.log('📊 Fetching prediction markets...');
  const markets = await fetchActiveMarkets();
  console.log(`Found ${markets.length} markets\n`);
  
  console.log('🔍 Fetching trending topics...');
  const trends = await fetchTrendingTopics();
  console.log(`Found ${trends.length} trending topics\n`);
  
  console.log('📅 Fetching upcoming events...');
  const upcomingEvents = await fetchUpcomingEvents();
  console.log(`Found ${upcomingEvents.length} upcoming events\n`);
  
  // Combine all events
  const allEvents = [...trends, ...upcomingEvents];
  
  // Match events to markets
  console.log('🔗 Matching events to markets...');
  const matches = matchEventsToMarkets(allEvents, markets);
  console.log(`Found ${matches.length} potential matches\n`);
  
  // Generate outputs
  console.log('📝 Generating outputs...');
  const html = generateHTML(matches, allEvents, markets);
  const markdown = generateMarkdown(matches, allEvents, markets);
  
  // Save files
  await fs.writeFile('output/calendar.html', html);
  await fs.writeFile('output/calendar.md', markdown);
  
  console.log('✅ Done! Files saved:');
  console.log('   - output/calendar.html');
  console.log('   - output/calendar.md');
  
  return { matches, allEvents, markets };
}

// Run as CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCalendar().catch(console.error);
}