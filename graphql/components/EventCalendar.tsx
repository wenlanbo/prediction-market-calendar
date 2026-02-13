import React, { useState, useMemo } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { gql } from 'graphql-request';
import { Calendar, Card, Tag, Progress, Statistic, Tooltip, Spin } from 'antd';
import { CalendarOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const GET_CALENDAR_EVENTS = gql`
  query GetCalendarEvents($startDate: timestamptz!, $endDate: timestamptz!) {
    event(
      where: {
        status: { _eq: "active" }
        end_date: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { end_date: asc }
    ) {
      id
      title
      slug
      end_date
      probability
      volume
      trader_count
      
      categories {
        category {
          id
          name
          color
          icon
        }
      }
      
      metadata {
        image_url
      }
      
      outcomes(order_by: { display_order: asc }, limit: 2) {
        name
        probability
        metadata {
          color
        }
      }
    }
  }
`;

const WATCH_EVENT_UPDATES = gql`
  subscription WatchEventUpdates($eventIds: [uuid!]!) {
    event(where: { id: { _in: $eventIds } }) {
      id
      probability
      volume
      trader_count
      updated_at
      
      outcomes {
        name
        probability
      }
    }
  }
`;

interface Event {
  id: string;
  title: string;
  slug: string;
  end_date: string;
  probability: number;
  volume: number;
  trader_count: number;
  categories: Array<{
    category: {
      id: number;
      name: string;
      color: string;
      icon: string;
    };
  }>;
  metadata?: {
    image_url?: string;
  };
  outcomes: Array<{
    name: string;
    probability: number;
    metadata?: {
      color?: string;
    };
  }>;
}

export const EventCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  
  // Calculate date range for query
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === 'month') {
      return {
        startDate: selectedDate.startOf('month').toISOString(),
        endDate: selectedDate.endOf('month').toISOString(),
      };
    } else {
      return {
        startDate: selectedDate.startOf('year').toISOString(),
        endDate: selectedDate.endOf('year').toISOString(),
      };
    }
  }, [selectedDate, viewMode]);

  // Fetch events
  const { data, loading, error } = useQuery(GET_CALENDAR_EVENTS, {
    variables: { startDate, endDate },
  });

  // Subscribe to real-time updates for visible events
  const eventIds = data?.event?.map((e: Event) => e.id) || [];
  useSubscription(WATCH_EVENT_UPDATES, {
    variables: { eventIds },
    skip: eventIds.length === 0,
  });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    data?.event?.forEach((event: Event) => {
      const date = dayjs(event.end_date).format('YYYY-MM-DD');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    
    return grouped;
  }, [data]);

  // Calendar cell renderer
  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const events = eventsByDate[dateStr] || [];
    
    if (events.length === 0) return null;

    return (
      <div className="event-list">
        {events.slice(0, 3).map((event) => (
          <EventBadge key={event.id} event={event} />
        ))}
        {events.length > 3 && (
          <div className="more-events">+{events.length - 3} more</div>
        )}
      </div>
    );
  };

  const monthCellRender = (date: Dayjs) => {
    const monthEvents = Object.entries(eventsByDate)
      .filter(([dateStr]) => dayjs(dateStr).isSame(date, 'month'))
      .reduce((acc, [_, events]) => acc + events.length, 0);
    
    if (monthEvents === 0) return null;
    
    return (
      <div className="month-events">
        <Tag color="blue">{monthEvents} events</Tag>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Loading events..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ color: '#ff4d4f' }}>
          Error loading events: {error.message}
        </div>
      </Card>
    );
  }

  return (
    <div className="event-calendar">
      <Card 
        title="Prediction Market Calendar"
        extra={
          <div className="calendar-stats">
            <Statistic 
              value={data?.event?.length || 0} 
              suffix="events"
              prefix={<CalendarOutlined />}
            />
          </div>
        }
      >
        <Calendar
          value={selectedDate}
          onSelect={setSelectedDate}
          dateCellRender={dateCellRender}
          monthCellRender={monthCellRender}
          onPanelChange={(date, mode) => {
            setSelectedDate(date);
            setViewMode(mode as 'month' | 'year');
          }}
        />
      </Card>

      <style jsx>{`
        .event-list {
          padding: 2px;
        }
        
        .more-events {
          font-size: 11px;
          color: #999;
          text-align: center;
          margin-top: 2px;
        }
        
        .calendar-stats {
          display: flex;
          gap: 20px;
        }
      `}</style>
    </div>
  );
};

// Individual event badge component
const EventBadge: React.FC<{ event: Event }> = ({ event }) => {
  const primaryCategory = event.categories.find(c => c.category)?.category;
  const probability = event.probability || 0.5;
  const percentChance = (probability * 100).toFixed(0);
  
  return (
    <Tooltip
      title={
        <div>
          <div><strong>{event.title}</strong></div>
          <div>Probability: {percentChance}%</div>
          <div>Volume: ${(event.volume / 1000).toFixed(0)}k</div>
          <div>Traders: {event.trader_count}</div>
        </div>
      }
    >
      <div 
        className="event-badge"
        style={{
          borderLeftColor: primaryCategory?.color || '#1890ff',
        }}
      >
        <div className="event-icon">
          {primaryCategory?.icon || '📊'}
        </div>
        <div className="event-info">
          <div className="event-title">{event.title}</div>
          <Progress 
            percent={probability * 100} 
            size="small" 
            showInfo={false}
            strokeColor={probability > 0.7 ? '#52c41a' : probability < 0.3 ? '#ff4d4f' : '#1890ff'}
          />
        </div>
      </div>

      <style jsx>{`
        .event-badge {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          margin-bottom: 4px;
          background: #f5f5f5;
          border-radius: 4px;
          border-left: 3px solid;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .event-badge:hover {
          background: #e6e6e6;
          transform: translateX(2px);
        }
        
        .event-icon {
          margin-right: 8px;
          font-size: 16px;
        }
        
        .event-info {
          flex: 1;
          min-width: 0;
        }
        
        .event-title {
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </Tooltip>
  );
};