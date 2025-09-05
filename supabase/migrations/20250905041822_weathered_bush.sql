/*
  # Update data isolation for multi-tenant architecture

  1. Data Isolation
    - Ensure all tables use company_id for data separation
    - Update RLS policies for proper company-based access
    - Add company_id to all user-generated data

  2. User Management
    - Enable company admins to invite users
    - Support multiple users per company
    - Maintain proper role-based access
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own company memberships" ON company_users;
DROP POLICY IF EXISTS "Allow company membership inserts" ON company_users;
DROP POLICY IF EXISTS "Users can update own membership" ON company_users;

-- Update company_users policies for proper multi-tenant access
CREATE POLICY "Users can view own company memberships"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow company membership inserts"
  ON company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership"
  ON company_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add company admin policy for managing users
CREATE POLICY "Company admins can manage users"
  ON company_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = company_users.company_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner', 'admin')
      AND cu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = company_users.company_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner', 'admin')
      AND cu.is_active = true
    )
  );

-- Update all data tables to ensure company_id isolation
-- Customers table
DROP POLICY IF EXISTS "Company users can manage company customers" ON customers;
CREATE POLICY "Company users can manage company customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Subcontractors table
DROP POLICY IF EXISTS "Company users can manage company subcontractors" ON subcontractors;
CREATE POLICY "Company users can manage company subcontractors"
  ON subcontractors
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Insurance estimates table
DROP POLICY IF EXISTS "Company users can manage company estimates" ON insurance_estimates;
CREATE POLICY "Company users can manage company estimates"
  ON insurance_estimates
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Work orders table
DROP POLICY IF EXISTS "Company users can manage company work orders" ON work_orders;
CREATE POLICY "Company users can manage company work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Calendar events table
DROP POLICY IF EXISTS "Company users can manage company calendar events" ON calendar_events;
CREATE POLICY "Company users can manage company calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Estimate documents table
DROP POLICY IF EXISTS "Company users can manage company estimate documents" ON estimate_documents;
CREATE POLICY "Company users can manage company estimate documents"
  ON estimate_documents
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Create helper function to get user's current company
CREATE OR REPLACE FUNCTION get_user_current_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT current_company_id FROM profiles WHERE id = auth.uid();
$$;

-- Create function to check if user has role in company
CREATE OR REPLACE FUNCTION user_has_company_role(company_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE company_id = company_uuid
    AND user_id = auth.uid()
    AND role = required_role
    AND is_active = true
  );
$$;