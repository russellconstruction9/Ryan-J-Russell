/*
  # Add calendar events functionality

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `customer_id` (uuid, optional foreign key to customers)
      - `subcontractor_id` (uuid, optional foreign key to subcontractors)
      - `title` (text, required)
      - `description` (text, optional)
      - `event_date` (date, required)
      - `event_time` (time, required)
      - `event_type` (text, required - estimate, work_order, meeting, inspection)
      - `status` (text, default 'scheduled')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `calendar_events` table
    - Add policy for authenticated users to manage their own events

  3. Indexes
    - Index on user_id for performance
    - Index on event_date for calendar queries
    - Index on customer_id and subcontractor_id for filtering
</sql>

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('estimate', 'work_order', 'meeting', 'inspection')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subcontractor_id ON calendar_events(subcontractor_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();