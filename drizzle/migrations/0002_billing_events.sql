-- Billing events — records Stripe webhook events for payment tracking
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(100) UNIQUE,
  stripe_invoice_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  client_email VARCHAR(255),
  client_name VARCHAR(255),
  description TEXT,
  invoice_url TEXT,
  invoice_pdf TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_project ON billing_events(project_id);
CREATE INDEX idx_billing_events_created ON billing_events(created_at DESC);
CREATE INDEX idx_billing_events_stripe ON billing_events(stripe_event_id);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing events"
  ON billing_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));
