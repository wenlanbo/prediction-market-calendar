/**
 * Utility functions for generating market URLs across different platforms
 */

export interface MarketUrlGenerators {
  [key: string]: (marketId: string, additional?: any) => string;
}

/**
 * Generate market URLs for different prediction market platforms
 */
export const marketUrls: MarketUrlGenerators = {
  /**
   * 42.space (FortyTwo Protocol)
   * URL Pattern: https://42.space/event/{market_address}
   * 
   * Based on frontend analysis, they use market_address directly in the URL
   * Example: https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De
   */
  '42space': (marketAddress: string) => {
    // Ensure address has 0x prefix
    const address = marketAddress.startsWith('0x') ? marketAddress : `0x${marketAddress}`;
    return `https://42.space/event/${address}`;
  },

  /**
   * Polymarket
   * URL Pattern: https://polymarket.com/market/{market_id}
   * 
   * Market ID is typically a slug or CLOB market ID
   * Example: https://polymarket.com/market/will-bitcoin-reach-100k-by-2025
   */
  'polymarket': (marketId: string) => {
    return `https://polymarket.com/market/${marketId}`;
  },

  /**
   * Manifold Markets
   * URL Pattern: https://manifold.markets/{username}/{slug}
   * 
   * Requires both username and market slug
   * Example: https://manifold.markets/EliezerYudkowsky/will-ai-be-transformative-by-2030
   */
  'manifold': (marketSlug: string, additional?: { username?: string }) => {
    const username = additional?.username || 'markets';
    return `https://manifold.markets/${username}/${marketSlug}`;
  },

  /**
   * Metaculus
   * URL Pattern: https://metaculus.com/questions/{question_id}/
   * 
   * Uses numeric question ID
   * Example: https://metaculus.com/questions/12345/
   */
  'metaculus': (questionId: string) => {
    return `https://metaculus.com/questions/${questionId}/`;
  },

  /**
   * Kalshi
   * URL Pattern: https://kalshi.com/markets/{market_ticker}
   * 
   * Uses market ticker symbol
   * Example: https://kalshi.com/markets/FED-23DEC
   */
  'kalshi': (marketTicker: string) => {
    return `https://kalshi.com/markets/${marketTicker}`;
  },

  /**
   * PredictIt
   * URL Pattern: https://www.predictit.org/markets/detail/{market_id}
   * 
   * Uses numeric market ID
   * Example: https://www.predictit.org/markets/detail/7456
   */
  'predictit': (marketId: string) => {
    return `https://www.predictit.org/markets/detail/${marketId}`;
  },

  /**
   * Futuur
   * URL Pattern: https://futuur.com/q/{question_id}/{slug}
   * 
   * Uses question ID and optional slug
   * Example: https://futuur.com/q/123456/will-bitcoin-hit-100k
   */
  'futuur': (questionId: string, additional?: { slug?: string }) => {
    const slug = additional?.slug || '';
    return `https://futuur.com/q/${questionId}${slug ? `/${slug}` : ''}`;
  }
};

/**
 * Get market URL for a given platform and market ID
 */
export function getMarketUrl(
  platform: string, 
  marketId: string, 
  additional?: any
): string | null {
  const generator = marketUrls[platform.toLowerCase()];
  if (!generator) {
    console.warn(`No URL generator found for platform: ${platform}`);
    return null;
  }
  
  try {
    return generator(marketId, additional);
  } catch (error) {
    console.error(`Error generating URL for ${platform}:`, error);
    return null;
  }
}

/**
 * Extract market ID from a market URL
 * Useful for reverse lookups
 */
export function extractMarketId(url: string): { platform?: string; id?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // 42.space
    if (hostname.includes('42.space')) {
      const match = pathname.match(/\/event\/([0x[a-fA-F0-9]+)/);
      return { platform: '42space', id: match?.[1] };
    }

    // Polymarket
    if (hostname.includes('polymarket.com')) {
      const match = pathname.match(/\/market\/([^\/]+)/);
      return { platform: 'polymarket', id: match?.[1] };
    }

    // Manifold
    if (hostname.includes('manifold.markets')) {
      const match = pathname.match(/\/([^\/]+)\/([^\/]+)/);
      return { platform: 'manifold', id: match?.[2] };
    }

    // Metaculus
    if (hostname.includes('metaculus.com')) {
      const match = pathname.match(/\/questions\/(\d+)/);
      return { platform: 'metaculus', id: match?.[1] };
    }

    // Add more platforms as needed...

    return {};
  } catch (error) {
    console.error('Error parsing market URL:', error);
    return {};
  }
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format market address for display (shortened)
 */
export function formatMarketAddress(address: string): string {
  if (!isValidEthereumAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Example usage:
// const fortyTwoUrl = getMarketUrl('42space', '0xCcF0379a3177bc7CC2257e7c02318327EF2A61De');
// console.log(fortyTwoUrl); // https://42.space/event/0xCcF0379a3177bc7CC2257e7c02318327EF2A61De