/*
  # Fix companies table INSERT policy

  1. Security Changes
    - Add INSERT policy for companies table to allow authenticated users to create companies during signup
    - This is needed for the signup flow where users create their company account
    - The user-company relationship is established afterward via company_users table
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Company members can update company" ON companies;

-- Allow authenticated users to insert companies (needed for signup)
CREATE POLICY "Authenticated users can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view companies they belong to
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

-- Allow company members to update their company
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