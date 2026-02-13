-- Prediction Market Calendar Database Schema
-- Based on FortyTwo Protocol patterns

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categories & Taxonomy
CREATE TABLE category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- hex color
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subcategory (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

CREATE TABLE topic (
    id BIGSERIAL PRIMARY KEY,
    subcategory_id BIGINT NOT NULL REFERENCES subcategory(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[], -- for search/matching
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subcategory_id, slug)
);

-- Tags
CREATE TABLE tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Sources
CREATE TABLE event_source (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    base_url VARCHAR(500),
    api_type VARCHAR(50), -- 'polymarket', 'manifold', 'metaculus', 'custom'
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}', -- source-specific config
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main Events table (questions/markets)
CREATE TABLE event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id BIGINT REFERENCES event_source(id),
    external_id VARCHAR(255), -- ID from source
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'resolved', 'cancelled'
    event_type VARCHAR(50) NOT NULL DEFAULT 'prediction', -- 'prediction', 'scheduled', 'milestone'
    
    -- Timing
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ NOT NULL,
    resolution_date TIMESTAMPTZ,
    
    -- Market data
    probability DECIMAL(5,4), -- 0.0000 to 1.0000
    volume DECIMAL(20,2),
    liquidity DECIMAL(20,2),
    trader_count INTEGER DEFAULT 0,
    
    -- Links
    source_url VARCHAR(1000),
    discussion_url VARCHAR(1000),
    
    -- Search
    search_vector tsvector,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_id, external_id)
);

-- Event metadata (additional structured data)
CREATE TABLE event_metadata (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    image_url VARCHAR(1000),
    banner_url VARCHAR(1000),
    resolution_criteria TEXT,
    additional_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id)
);

-- Outcomes for multi-outcome events
CREATE TABLE outcome (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    probability DECIMAL(5,4),
    volume DECIMAL(20,2),
    is_winning_outcome BOOLEAN,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome metadata
CREATE TABLE outcome_metadata (
    id BIGSERIAL PRIMARY KEY,
    outcome_id BIGINT NOT NULL REFERENCES outcome(id) ON DELETE CASCADE,
    description TEXT,
    symbol VARCHAR(10),
    color VARCHAR(7),
    image_url VARCHAR(1000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outcome_id)
);

-- Join tables for taxonomy
CREATE TABLE event_category (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, category_id)
);

CREATE TABLE event_subcategory (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    subcategory_id BIGINT NOT NULL REFERENCES subcategory(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, subcategory_id)
);

CREATE TABLE event_topic (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, topic_id)
);

CREATE TABLE event_tag (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, tag_id)
);

-- Price history for tracking
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    outcome_id BIGINT REFERENCES outcome(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    price DECIMAL(5,4) NOT NULL,
    volume_24h DECIMAL(20,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-specific data (if needed)
CREATE TABLE calendar_subscription (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    filters JSONB DEFAULT '{}', -- category_ids, tag_ids, min_volume, etc.
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit/sync logs
CREATE TABLE sync_log (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES event_source(id),
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'single_event'
    status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
    events_processed INTEGER DEFAULT 0,
    events_added INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_event_end_date ON event(end_date);
CREATE INDEX idx_event_status ON event(status);
CREATE INDEX idx_event_source ON event(source_id, external_id);
CREATE INDEX idx_event_search ON event USING gin(search_vector);
CREATE INDEX idx_event_probability ON event(probability) WHERE status = 'active';
CREATE INDEX idx_event_volume ON event(volume DESC NULLS LAST) WHERE status = 'active';
CREATE INDEX idx_outcome_event ON outcome(event_id);
CREATE INDEX idx_price_history_event_time ON price_history(event_id, timestamp DESC);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_event_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_search 
    BEFORE INSERT OR UPDATE OF title, description ON event
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_search_vector();

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_updated_at BEFORE UPDATE ON category FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subcategory_updated_at BEFORE UPDATE ON subcategory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_topic_updated_at BEFORE UPDATE ON topic FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tag_updated_at BEFORE UPDATE ON tag FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON event FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_source_updated_at BEFORE UPDATE ON event_source FOR EACH ROW EXECUTE FUNCTION update_updated_at();