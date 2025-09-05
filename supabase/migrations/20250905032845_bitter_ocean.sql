/*
  # Add budget versioning system

  1. New Tables
    - `budget_versions`
      - `id` (uuid, primary key)
      - `estimate_id` (uuid, foreign key to insurance_estimates)
      - `user_id` (uuid, foreign key to users)
      - `version_number` (integer)
      - `budget_data` (jsonb)
      - `reconciled_data` (jsonb)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `budget_versions` table
    - Add policy for authenticated users to manage their own budget versions

  3. Changes
    - Users can save multiple versions of budgets
    - Original budget is preserved as version 1
    - Each edit creates a new version
*/

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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_versions_estimate_id ON budget_versions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_user_id ON budget_versions(user_id);

-- Create unique constraint to prevent duplicate version numbers per estimate
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_versions_estimate_version 
  ON budget_versions(estimate_id, version_number);