import React from 'react';
import { Button, Tooltip } from 'antd';
import { LinkOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getMarketUrl, formatMarketAddress } from '../utils/market-urls';

interface MarketLinkProps {
  platform: string;
  marketId: string;
  questionId?: string;
  title?: string;
  showAddress?: boolean;
  className?: string;
}

/**
 * Component to render market links with proper URL construction
 * Handles different platforms and their URL patterns
 */
export const MarketLink: React.FC<MarketLinkProps> = ({
  platform,
  marketId,
  questionId,
  title,
  showAddress = false,
  className,
}) => {
  // Generate the correct URL based on platform
  const marketUrl = getMarketUrl(platform, marketId);

  if (!marketUrl) {
    return (
      <Tooltip title="Market link not available">
        <span className={className}>
          <QuestionCircleOutlined /> Market
        </span>
      </Tooltip>
    );
  }

  // Special handling for 42.space
  if (platform.toLowerCase() === '42space' || platform.toLowerCase() === 'fortytwo') {
    return (
      <div className={className}>
        <Tooltip title={`Market Address: ${marketId}`}>
          <Button
            type="link"
            icon={<LinkOutlined />}
            href={marketUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on 42.space
            {showAddress && (
              <span style={{ marginLeft: 8, opacity: 0.7 }}>
                ({formatMarketAddress(marketId)})
              </span>
            )}
          </Button>
        </Tooltip>
        {questionId && (
          <div style={{ fontSize: '12px', opacity: 0.6, marginTop: 4 }}>
            Question ID: {questionId}
          </div>
        )}
      </div>
    );
  }

  // Default rendering for other platforms
  return (
    <Button
      type="link"
      className={className}
      icon={<LinkOutlined />}
      href={marketUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {title || `View on ${platform}`}
    </Button>
  );
};

/**
 * Batch component to render multiple market links
 */
interface MarketLinksProps {
  markets: Array<{
    platform: string;
    marketId: string;
    questionId?: string;
  }>;
}

export const MarketLinks: React.FC<MarketLinksProps> = ({ markets }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {markets.map((market, index) => (
        <MarketLink
          key={`${market.platform}-${market.marketId}-${index}`}
          platform={market.platform}
          marketId={market.marketId}
          questionId={market.questionId}
        />
      ))}
    </div>
  );
};

/**
 * Example usage in a component
 */
export const MarketExample: React.FC = () => {
  const exampleMarkets = [
    {
      platform: '42space',
      marketId: '0xCcF0379a3177bc7CC2257e7c02318327EF2A61De',
      questionId: 'q_12345',
    },
    {
      platform: 'polymarket',
      marketId: 'will-bitcoin-reach-100k-by-2025',
    },
    {
      platform: 'manifold',
      marketId: 'will-agi-by-2030',
    },
  ];

  return (
    <div>
      <h3>Market Links Example</h3>
      
      {/* Individual market link with address display */}
      <MarketLink
        platform="42space"
        marketId="0xCcF0379a3177bc7CC2257e7c02318327EF2A61De"
        questionId="q_12345"
        showAddress={true}
      />

      {/* Multiple market links */}
      <h4>Cross-Platform Markets</h4>
      <MarketLinks markets={exampleMarkets} />
    </div>
  );
};