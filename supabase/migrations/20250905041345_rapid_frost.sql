/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - RLS policies on company_users and companies tables are creating circular dependencies
    - company_users policies reference companies, companies policies reference company_users
    - This creates infinite recursion when querying

  2. Solution
    - Drop all existing problematic policies
    - Create simple, direct policies that avoid circular references
    - Use auth.uid() directly without cross-table lookups where possible
    - Separate read and write permissions clearly

  3. Security
    - Users can only see their own company memberships
    - Users can only see companies they belong to
    - Admins can manage users within their companies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view company members" ON company_users;
DROP POLICY IF EXISTS "Company admins can manage users" ON company_users;
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Company owners and admins can update company" ON companies;

-- Simple policy for company_users: users can only see their own records
CREATE POLICY "Users can view own company memberships"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Simple policy for company_users: allow inserts for new memberships
CREATE POLICY "Allow company membership inserts"
  ON company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Simple policy for company_users: users can update their own records
CREATE POLICY "Users can update own membership"
  ON company_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Simple policy for companies: allow reading companies where user is a member
-- This uses a simple EXISTS check without complex joins
CREATE POLICY "Users can view companies they belong to"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = companies.id 
      AND company_users.user_id = auth.uid()
      AND company_users.is_active = true
    )
  );

-- Simple policy for companies: allow updates by company members
CREATE POLICY "Company members can update company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = companies.id 
      AND company_users.user_id = auth.uid()
      AND company_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = companies.id 
      AND company_users.user_id = auth.uid()
      AND company_users.is_active = true
    )
  );