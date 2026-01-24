-- Review Suggestions Table
-- Stores user-submitted suggestions to add or delete reviews

CREATE TABLE IF NOT EXISTS review_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('add', 'delete')),
  kindergarten_id VARCHAR(50) NOT NULL,
  -- For 'add' type
  url TEXT,
  title VARCHAR(200),
  source VARCHAR(20),
  -- For 'delete' type
  review_id VARCHAR(50),
  -- Common fields
  reason TEXT,
  submitter_email VARCHAR(100),
  submitter_ip VARCHAR(45), -- IPv6 compatible
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_add_suggestion CHECK (
    type != 'add' OR (url IS NOT NULL AND title IS NOT NULL)
  ),
  CONSTRAINT valid_delete_suggestion CHECK (
    type != 'delete' OR review_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_review_suggestions_status ON review_suggestions(status);
CREATE INDEX idx_review_suggestions_kindergarten ON review_suggestions(kindergarten_id);
CREATE INDEX idx_review_suggestions_ip_created ON review_suggestions(submitter_ip, created_at);

-- RLS Policies
ALTER TABLE review_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for anonymous submissions)
CREATE POLICY "Anyone can submit suggestions"
  ON review_suggestions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read/update (for admin dashboard)
CREATE POLICY "Service role can manage suggestions"
  ON review_suggestions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
