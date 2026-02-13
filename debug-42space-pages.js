import axios from 'axios';

async function debugPage(url, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5,
      validateStatus: () => true
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data && typeof response.data === 'string') {
      const html = response.data;
      
      // Extract page title
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(`Page Title: ${titleMatch[1]}`);
      }
      
      // Look for meta description
      const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      if (metaMatch) {
        console.log(`Meta Description: ${metaMatch[1].substring(0, 100)}...`);
      }
      
      // Look for og:title
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
      if (ogTitleMatch) {
        console.log(`OG Title: ${ogTitleMatch[1]}`);
      }
      
      // Look for any error messages
      const errorPatterns = [
        /error/i,
        /not found/i,
        /404/i,
        /invalid/i
      ];
      
      errorPatterns.forEach(pattern => {
        const matches = html.match(new RegExp(`<[^>]*>[^<]*${pattern.source}[^<]*<`, 'gi'));
        if (matches && matches.length > 0) {
          console.log(`Found error-like text: ${matches[0].substring(0, 100)}`);
        }
      });
      
      // Look for market-specific content
      if (html.includes('Backpack')) {
        console.log('✓ Page mentions "Backpack"');
      }
      if (html.includes('SpaceX')) {
        console.log('✓ Page mentions "SpaceX"');
      }
      if (html.includes('market cap')) {
        console.log('✓ Page mentions "market cap"');
      }
      
      // Check for JSON data in script tags
      const jsonPattern = /<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/gs;
      let jsonMatch;
      while ((jsonMatch = jsonPattern.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          if (jsonData.market || jsonData.question || jsonData.props?.pageProps?.market) {
            console.log('Found market data in JSON script tag');
            if (jsonData.props?.pageProps?.market?.market_address) {
              console.log(`Market address in data: ${jsonData.props?.pageProps?.market?.market_address}`);
            }
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

async function main() {
  console.log('=== Debugging 42.space Pages ===');
  
  // Test API market address
  await debugPage(
    'https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De',
    'API Market Address (Backpack)'
  );
  
  // Test user-mentioned address
  await debugPage(
    'https://42.space/event/0x0842630d678d74B7E7Bb6C14091a85836229A048',
    'User-Mentioned Address'
  );
  
  // Test another API market
  await debugPage(
    'https://42.space/event/0xC092e082773CD827883E8F98abf6f9C9184d6154',
    'API Market Address (SpaceX)'
  );
}

main().catch(console.error);