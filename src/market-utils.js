// Utility functions for market URLs and display

export function getMarketUrl(market) {
  if (market.source === '42') {
    // 42.space URLs - note that site requires desktop browser
    return {
      url: `https://www.42.space/event/${market.contractAddress}`,
      note: '42.space works best on desktop browsers',
      desktopOnly: true
    };
  } else if (market.source === 'polymarket') {
    // Polymarket URLs work on all devices
    return {
      url: market.url,
      note: null,
      desktopOnly: false
    };
  }
  
  return {
    url: market.url || '#',
    note: null,
    desktopOnly: false
  };
}

export function formatMarketInfo(market) {
  const info = {
    basicStats: [],
    outcomes: [],
    metadata: []
  };
  
  // Basic stats
  if (market.volume) {
    info.basicStats.push({
      label: 'Volume',
      value: `$${Math.round(market.volume).toLocaleString()}`
    });
  }
  
  if (market.marketCap) {
    info.basicStats.push({
      label: 'Market Cap',
      value: `$${Math.round(market.marketCap).toLocaleString()}`
    });
  }
  
  if (market.traders) {
    info.basicStats.push({
      label: 'Traders',
      value: market.traders.toLocaleString()
    });
  }
  
  if (market.liquidity) {
    info.basicStats.push({
      label: 'Liquidity',
      value: `$${Math.round(market.liquidity).toLocaleString()}`
    });
  }
  
  // Outcomes
  if (market.outcomes && Array.isArray(market.outcomes)) {
    info.outcomes = market.outcomes.map(o => ({
      name: o.symbol || o.name || 'Unknown',
      price: o.price_hmr ? (o.price_hmr * 100).toFixed(1) + '%' : null,
      marketCap: o.market_cap_hmr ? `$${Math.round(o.market_cap_hmr).toLocaleString()}` : null
    }));
  }
  
  // Metadata
  if (market.endDate) {
    info.metadata.push({
      label: 'Ends',
      value: new Date(market.endDate).toLocaleDateString()
    });
  }
  
  if (market.status) {
    info.metadata.push({
      label: 'Status',
      value: market.status.charAt(0).toUpperCase() + market.status.slice(1)
    });
  }
  
  if (market.category) {
    info.metadata.push({
      label: 'Category',
      value: market.category
    });
  }
  
  return info;
}

// Alternative ways to view 42.space markets
export function get42AlternativeViews(contractAddress) {
  return [
    {
      name: 'Contract on Etherscan',
      url: `https://etherscan.io/address/${contractAddress}`,
      description: 'View contract details'
    },
    {
      name: 'Direct API Query',
      url: `https://dev-api.42.space/v1/graphql`,
      description: 'Query GraphQL API directly'
    }
  ];
}