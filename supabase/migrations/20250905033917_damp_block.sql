/*
  # Create budget versions table

  1. New Tables
    - `budget_versions`
      - `id` (uuid, primary key)
      - `estimate_id` (uuid, foreign key to insurance_estimates)
      - `user_id` (uuid, foreign key to users)
      - `version_number` (integer)
      - `budget_data` (jsonb) - Complete budget JSON data
      - `reconciled_data` (jsonb) - Reconciled calculation results
      - `notes` (text) - Optional revision notes
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `budget_versions` table
    - Add policy for users to manage their own budget versions

  3. Indexes
    - Index on estimate_id for fast lookups
    - Index on user_id for user-specific queries
    - Index on version_number for ordering
</*/

CREATE TABLE IF NOT EXISTS budget_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES insurance_estimates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  budget_data jsonb,
  reconciled_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budget versions"
  ON budget_versions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budget_versions_estimate_id ON budget_versions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_user_id ON budget_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_version_number ON budget_versions(estimate_id, version_number);

-- Add unique constraint to prevent duplicate version numbers per estimate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_versions_estimate_version_unique'
  ) THEN
    ALTER TABLE budget_versions 
    ADD CONSTRAINT budget_versions_estimate_version_unique 
    UNIQUE (estimate_id, version_number);
  END IF;
END $$;