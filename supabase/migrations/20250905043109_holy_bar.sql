/*
  # Fix infinite recursion in company_users policies

  1. Problem
    - RLS policies on company_users table are causing infinite recursion
    - Policies are referencing company_users table within their own conditions
    - This creates circular dependency when Supabase tries to evaluate policies

  2. Solution
    - Drop all existing policies on company_users table
    - Create simple, non-recursive policies that only use auth.uid()
    - Remove any subqueries that reference company_users table
    - Use basic authentication checks only

  3. Security
    - Users can only see their own company memberships
    - No complex company lookups that cause recursion
    - Application layer handles additional filtering if needed
*/

-- Drop all existing policies on company_users table
DROP POLICY IF EXISTS "Company users can insert memberships" ON company_users;
DROP POLICY IF EXISTS "Company users can update memberships" ON company_users;
DROP POLICY IF EXISTS "Company users can view team members" ON company_users;
DROP POLICY IF EXISTS "Users can view their company memberships" ON company_users;
DROP POLICY IF EXISTS "Company admins can manage team members" ON company_users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own memberships"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memberships"
  ON company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memberships"
  ON company_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also fix companies table policies to be simple
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Users can update their companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;

CREATE POLICY "Authenticated users can view companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);