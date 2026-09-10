CREATE EXTENSION IF NOT EXISTS vector;


CREATE TABLE IF NOT EXISTS brands (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS intent_definitions (
  id BIGSERIAL PRIMARY KEY,
  brand_id BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  inclusion_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusion_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (brand_id, name)
);

CREATE TABLE IF NOT EXISTS support_cases (
  id BIGSERIAL PRIMARY KEY,
  brand_id BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  customer_tweet_id TEXT NOT NULL UNIQUE,
  brand_tweet_id TEXT NOT NULL,
  customer_message TEXT NOT NULL,
  historical_reply TEXT NOT NULL,
  customer_created_at TIMESTAMPTZ,
  brand_created_at TIMESTAMPTZ,
  evidence_type TEXT NOT NULL DEFAULT 'direct_brand_reply',
  data_split TEXT NOT NULL CHECK (data_split IN ('development', 'evaluation')),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, customer_message)
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_cases_brand_split_idx
  ON support_cases (brand_id, data_split);

CREATE INDEX IF NOT EXISTS support_cases_conversation_idx
  ON support_cases (conversation_id);

CREATE INDEX IF NOT EXISTS support_cases_search_idx
  ON support_cases USING GIN (search_vector);

INSERT INTO brands (name)
VALUES ('AmazonHelp')
ON CONFLICT (name) DO NOTHING;
