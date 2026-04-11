-- Vision Studio requests table
-- Tracks all AI vision analysis requests for auditing and history

CREATE TABLE IF NOT EXISTS vision_studio_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'general',
  custom_prompt TEXT,
  analysis TEXT NOT NULL,
  model VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  image_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_vision_requests_user ON vision_studio_requests(user_id);

-- Index for project lookups
CREATE INDEX idx_vision_requests_project ON vision_studio_requests(project_id);

-- Index for time-based queries
CREATE INDEX idx_vision_requests_created ON vision_studio_requests(created_at DESC);

-- Enable RLS
ALTER TABLE vision_studio_requests ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can manage vision requests"
  ON vision_studio_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can see their own
CREATE POLICY "Users can view own vision requests"
  ON vision_studio_requests
  FOR SELECT
  USING (user_id = auth.uid());
