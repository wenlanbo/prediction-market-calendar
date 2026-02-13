import { fetchPolymarketComprehensive, getTopMarketsByCategory } from './polymarket-comprehensive.js';
import { fetch42Markets } from './42markets.js';
import { fetchMajorEvents2025, categorizeEvent } from './events-comprehensive.js';
import { fetchTrendingTopics, fetchUpcomingEvents } from './events.js';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';

// Enhanced matching with scoring
function matchEventsToMarketsEnhanced(events, polymarkets, fortyTwoMarkets) {
  const allMarkets = [...polymarkets, ...fortyTwoMarkets];
  const matches = [];
  
  for (const event of events) {
    for (const market of allMarkets) {
      let score = 0;
      const eventText = `${event.name} ${event.description || ''} ${(event.keywords || []).join(' ')}`.toLowerCase();
      const marketText = `${market.question} ${market.description || ''}`.toLowerCase();
      
      // Direct keyword matching
      if (event.keywords) {
        event.keywords.forEach(keyword => {
          if (marketText.includes(keyword.toLowerCase())) {
            score += 2;
          }
        });
      }
      
      // Category matching
      if (event.category && market.category && event.category === market.category) {
        score += 3;
      }
      
      // Date proximity (if both have dates)
      if (event.date && market.endDate) {
        try {
          const eventDate = new Date(event.date);
          const marketDate = new Date(market.endDate);
          const daysDiff = Math.abs(differenceInDays(eventDate, marketDate));
          
          if (daysDiff < 7) score += 2;
          else if (daysDiff < 30) score += 1;
        } catch (e) {
          // Ignore date parsing errors
        }
      }
      
      // Word matching
      const eventWords = eventText.split(/\s+/).filter(w => w.length > 3);
      const marketWords = marketText.split(/\s+/).filter(w => w.length > 3);
      const commonWords = eventWords.filter(w => marketWords.includes(w));
      score += commonWords.length;
      
      if (score > 2) { // Threshold for relevance
        matches.push({
          event,
          market,
          score,
          matchType: 'enhanced',
          platform: market.source
        });
      }
    }
  }
  
  // Sort by score and deduplicate
  return matches
    .sort((a, b) => b.score - a.score)
    .filter((match, index, self) => 
      index === self.findIndex((m) => 
        m.event.name === match.event.name && m.market.id === match.market.id
      )
    );
}

// Generate enhanced HTML with better styling
function generateEnhancedHTML(matches, events, polymarkets, fortyTwoMarkets, categories) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Prediction Market Calendar - Comprehensive View</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            background: #0a0a0a;
            color: #e0e0e0;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 40px 0;
            background: linear-gradient(135deg, #1e3a8a, #7c3aed);
            margin: -20px -20px 40px;
            color: white;
        }
        h1 { 
            margin: 0;
            font-size: 3em;
            font-weight: 700;
        }
        .subtitle {
            opacity: 0.9;
            margin-top: 10px;
            font-size: 1.2em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .stat-card {
            background: #1a1a1a;
            border: 1px solid #333;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #7c3aed;
        }
        .stat-label {
            color: #999;
            margin-top: 5px;
        }
        .section {
            margin: 40px 0;
            background: #1a1a1a;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #333;
        }
        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        h2 {
            margin: 0;
            color: #fff;
            font-size: 1.8em;
        }
        .match {
            background: #222;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border: 1px solid #444;
            transition: all 0.3s ease;
        }
        .match:hover {
            border-color: #7c3aed;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
        }
        .match-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
        }
        .match-score {
            background: #7c3aed;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .platform-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.85em;
            margin-left: 10px;
        }
        .platform-polymarket {
            background: #4F46E5;
            color: white;
        }
        .platform-42 {
            background: #10B981;
            color: white;
        }
        .market-stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .market-stat {
            font-size: 0.9em;
            color: #999;
        }
        .market-stat strong {
            color: #e0e0e0;
        }
        .event-card {
            background: #222;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            border: 1px solid #444;
        }
        .category-section {
            margin: 20px 0;
        }
        .category-header {
            font-size: 1.2em;
            color: #7c3aed;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .tag {
            display: inline-block;
            background: #333;
            color: #aaa;
            padding: 4px 12px;
            margin: 2px;
            border-radius: 20px;
            font-size: 0.85em;
        }
        .link-button {
            display: inline-block;
            background: #7c3aed;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .link-button:hover {
            background: #6b32d3;
            transform: translateY(-1px);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Prediction Market Calendar</h1>
        <p class="subtitle">Comprehensive Event & Market Tracking</p>
        <p style="opacity: 0.7">Last updated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="container">
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${polymarkets.length}</div>
                <div class="stat-label">Polymarket Markets</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${fortyTwoMarkets.length}</div>
                <div class="stat-label">42.space Markets</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${matches.length}</div>
                <div class="stat-label">Event Matches</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${events.length}</div>
                <div class="stat-label">Tracked Events</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>🔗 Top Event → Market Matches</h2>
                <span style="color: #999">AI-powered relevance scoring</span>
            </div>
            ${matches.slice(0, 20).map(match => `
                <div class="match">
                    <div class="match-header">
                        <div>
                            <h3 style="margin: 0 0 10px 0">${match.event.name}</h3>
                            <p style="margin: 0; color: #aaa">${match.event.description || ''}</p>
                        </div>
                        <div>
                            <span class="match-score">Score: ${match.score}</span>
                            <span class="platform-badge platform-${match.platform}">${match.platform.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: #1a1a1a; border-radius: 6px;">
                        <strong style="color: #7c3aed">Matched Market:</strong> ${match.market.question}
                        <div class="market-stats">
                            ${match.market.volume ? `<div class="market-stat"><strong>Volume:</strong> $${Math.round(match.market.volume).toLocaleString()}</div>` : ''}
                            ${match.market.marketCap ? `<div class="market-stat"><strong>Market Cap:</strong> $${Math.round(match.market.marketCap).toLocaleString()}</div>` : ''}
                            ${match.market.traders ? `<div class="market-stat"><strong>Traders:</strong> ${match.market.traders.toLocaleString()}</div>` : ''}
                            ${match.market.endDate ? `<div class="market-stat"><strong>Ends:</strong> ${new Date(match.market.endDate).toLocaleDateString()}</div>` : ''}
                            ${match.market.status ? `<div class="market-stat"><strong>Status:</strong> ${match.market.status}</div>` : ''}
                        </div>
                        ${match.market.outcomes && match.market.outcomes.length > 0 ? `
                            <div style="margin-top: 10px;">
                                <strong>Outcomes:</strong>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px;">
                                    ${match.market.outcomes.slice(0, 6).map(o => `
                                        <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
                                            ${o.symbol || o.name} ${o.price_hmr ? `(${(o.price_hmr * 100).toFixed(1)}%)` : ''}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        <div style="margin-top: 10px;">
                            ${match.market.source === '42' ? `
                                <div style="background: #444; padding: 10px; border-radius: 4px; margin-top: 5px;">
                                    <strong style="color: #10B981">42.space Market</strong><br>
                                    <span style="font-size: 0.85em; color: #ccc">Contract: ${match.market.contractAddress}</span><br>
                                    <div style="margin-top: 8px;">
                                        <a href="https://www.42.space" target="_blank" class="link-button" style="background: #10B981">
                                            Go to 42.space & Search →
                                        </a>
                                    </div>
                                    <div style="font-size: 0.8em; color: #999; margin-top: 5px">
                                        Search for: "${match.market.question.substring(0, 40)}..."<br>
                                        Note: 42.space API addresses don't match URL structure
                                    </div>
                                </div>
                            ` : `
                                <a href="${match.market.url}" target="_blank" class="link-button">View Market →</a>
                            `}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>📊 Markets by Category</h2>
            ${Object.entries(categories).map(([category, markets]) => `
                <div class="category-section">
                    <div class="category-header">${category}</div>
                    <div class="grid">
                        ${markets.slice(0, 6).map(market => `
                            <div class="event-card">
                                <strong>${market.question.length > 80 ? market.question.substring(0, 80) + '...' : market.question}</strong>
                                <div style="margin-top: 10px; color: #999; font-size: 0.9em;">
                                    Volume: $${Math.round(market.volume || 0).toLocaleString()}
                                </div>
                                ${market.source === '42' 
                                    ? '<span style="color: #10B981; font-size: 0.9em;">42.space</span>'
                                    : `<a href="${market.url}" target="_blank" style="color: #7c3aed; font-size: 0.9em;">View →</a>`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>📅 Major Events 2025</h2>
            <div class="grid">
                ${events.filter(e => e.date && e.category !== 'Trending').slice(0, 12).map(event => `
                    <div class="event-card">
                        <strong>${event.name}</strong>
                        <div style="margin-top: 5px;">
                            <span class="tag">${event.category}</span>
                            <span style="color: #999; font-size: 0.9em; margin-left: 10px">${event.date}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
  
  return html;
}

// Generate comprehensive markdown
function generateEnhancedMarkdown(matches, events, polymarkets, fortyTwoMarkets) {
  const md = `# Prediction Market Calendar - Comprehensive Report
Generated: ${new Date().toISOString()}

## 📊 Summary Statistics

- **Polymarket Markets**: ${polymarkets.length}
- **42.space Markets**: ${fortyTwoMarkets.length}  
- **Total Events Tracked**: ${events.length}
- **Event-Market Matches**: ${matches.length}

## 🔗 Top Event → Market Matches

${matches.slice(0, 30).map(match => `
### ${match.event.name}
- **Event Category**: ${match.event.category}
- **Event Date**: ${match.event.date || 'Ongoing'}
- **Description**: ${match.event.description || 'N/A'}
- **Relevance Score**: ${match.score}

**Matched Market** (${match.platform.toUpperCase()}):
- **Question**: ${match.market.question}
- **Volume**: $${Math.round(match.market.volume || 0).toLocaleString()}
- **End Date**: ${match.market.endDate ? new Date(match.market.endDate).toLocaleDateString() : 'N/A'}
- **Link**: [View Market](${match.market.url})
`).join('\n---\n')}

## 📈 Top Markets by Volume

### Polymarket
${polymarkets.slice(0, 20).map((m, i) => 
  `${i + 1}. **${m.question}**
   - Volume: $${Math.round(m.volume || 0).toLocaleString()}
   - [View](${m.url})`
).join('\n')}

### 42.space
${fortyTwoMarkets.slice(0, 20).map((m, i) => 
  `${i + 1}. **${m.question}**
   - Volume: $${Math.round(m.volume || 0).toLocaleString()}
   - [View](${m.url})`
).join('\n')}

## 📅 Major Events Calendar 2025

${events.filter(e => e.date).map(e => 
  `- **${e.name}** - ${e.date} [${e.category}]`
).join('\n')}

## 🏷️ Event Categories

${Object.entries(
  events.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {})
).map(([cat, evts]) => 
  `### ${cat} (${evts.length} events)
${evts.slice(0, 5).map(e => `- ${e.name}`).join('\n')}`
).join('\n\n')}
`;
  
  return md;
}

// Main generation function
export async function generateComprehensiveCalendar() {
  console.log('🚀 Starting Comprehensive Calendar Generation...\n');
  
  // Ensure output directory exists
  await fs.mkdir('output', { recursive: true });
  
  // Fetch all data sources
  console.log('📊 Fetching Polymarket data...');
  const polymarkets = await fetchPolymarketComprehensive();
  console.log(`Found ${polymarkets.length} Polymarket markets\n`);
  
  console.log('📊 Fetching 42.space data...');
  const fortyTwoMarkets = await fetch42Markets();
  console.log(`Found ${fortyTwoMarkets.length} 42.space markets\n`);
  
  console.log('📅 Fetching major events for 2025...');
  const majorEvents = await fetchMajorEvents2025();
  console.log(`Found ${majorEvents.length} major events\n`);
  
  console.log('🔍 Fetching trending topics...');
  const trends = await fetchTrendingTopics();
  console.log(`Found ${trends.length} trending topics\n`);
  
  // Get markets by category
  console.log('📊 Categorizing markets...');
  const marketsByCategory = await getTopMarketsByCategory();
  
  // Combine all events
  const allEvents = [...majorEvents, ...trends];
  
  // Enhanced matching
  console.log('🔗 Performing enhanced event-market matching...');
  const matches = matchEventsToMarketsEnhanced(allEvents, polymarkets, fortyTwoMarkets);
  console.log(`Found ${matches.length} high-quality matches\n`);
  
  // Generate outputs
  console.log('📝 Generating comprehensive outputs...');
  const html = generateEnhancedHTML(matches, allEvents, polymarkets, fortyTwoMarkets, marketsByCategory);
  const markdown = generateEnhancedMarkdown(matches, allEvents, polymarkets, fortyTwoMarkets);
  
  // Save files
  await fs.writeFile('output/calendar-comprehensive.html', html);
  await fs.writeFile('output/calendar-comprehensive.md', markdown);
  
  // Save JSON data for API
  const jsonData = {
    generated: new Date().toISOString(),
    stats: {
      polymarketCount: polymarkets.length,
      fortyTwoCount: fortyTwoMarkets.length,
      eventCount: allEvents.length,
      matchCount: matches.length
    },
    matches: matches.slice(0, 50),
    marketsByCategory,
    topPolymarkets: polymarkets.slice(0, 20),
    topFortyTwo: fortyTwoMarkets.slice(0, 20),
    majorEvents: majorEvents
  };
  
  await fs.writeFile('output/calendar-data.json', JSON.stringify(jsonData, null, 2));
  
  console.log('✅ Done! Files saved:');
  console.log('   - output/calendar-comprehensive.html');
  console.log('   - output/calendar-comprehensive.md');
  console.log('   - output/calendar-data.json');
  
  return jsonData;
}

// Run as CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateComprehensiveCalendar().catch(console.error);
}