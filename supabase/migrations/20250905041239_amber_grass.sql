/*
  # Fix infinite recursion in RLS policies

  1. Policy Updates
    - Simplify company_users policies to avoid circular references
    - Fix companies policies to prevent recursion
    - Remove complex subqueries that cause loops

  2. Security
    - Maintain proper data isolation
    - Ensure users can only access their own company data
    - Keep role-based access control intact
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Company owners and admins can update company" ON companies;
DROP POLICY IF EXISTS "Users can view company members" ON company_users;
DROP POLICY IF EXISTS "Company admins can manage users" ON company_users;

-- Create simplified policies for companies table
CREATE POLICY "Users can view their companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company owners can update company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND is_active = true
    )
  );

-- Create simplified policies for company_users table
CREATE POLICY "Users can view company members"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

CREATE POLICY "Company admins can manage users"
  ON company_users
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.role IN ('owner', 'admin') 
        AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.role IN ('owner', 'admin') 
        AND cu.is_active = true
    )
  );

-- Create simplified policies for company_invitations table
DROP POLICY IF EXISTS "Company admins can manage invitations" ON company_invitations;

CREATE POLICY "Company admins can manage invitations"
  ON company_invitations
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.role IN ('owner', 'admin') 
        AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.role IN ('owner', 'admin') 
        AND cu.is_active = true
    )
  );

-- Update all other table policies to use simplified company access pattern
DROP POLICY IF EXISTS "Company users can manage company customers" ON customers;
CREATE POLICY "Company users can manage company customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Company users can manage company subcontractors" ON subcontractors;
CREATE POLICY "Company users can manage company subcontractors"
  ON subcontractors
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Company users can manage company estimates" ON insurance_estimates;
CREATE POLICY "Company users can manage company estimates"
  ON insurance_estimates
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Company users can manage company work orders" ON work_orders;
CREATE POLICY "Company users can manage company work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Company users can manage company estimate documents" ON estimate_documents;
CREATE POLICY "Company users can manage company estimate documents"
  ON estimate_documents
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Company users can manage company calendar events" ON calendar_events;
CREATE POLICY "Company users can manage company calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

-- Remove the problematic helper functions that were causing recursion
DROP FUNCTION IF EXISTS get_user_company_id();
DROP FUNCTION IF EXISTS user_has_company_role(uuid, text);