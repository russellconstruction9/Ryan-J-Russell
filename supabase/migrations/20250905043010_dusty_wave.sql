/*
  # Fix Team Management Supabase Integration

  1. RLS Policies
    - Fix company_users policies for proper team management
    - Add policies for company_invitations
    - Ensure proper data access for team operations

  2. Security
    - Company-based data isolation
    - Role-based access control
    - Proper invitation management
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own memberships" ON company_users;
DROP POLICY IF EXISTS "Users can insert own memberships" ON company_users;
DROP POLICY IF EXISTS "Users can update own memberships" ON company_users;

-- Create simple, non-recursive policies for company_users
CREATE POLICY "Company users can view team members"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company users can insert memberships"
  ON company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company users can update memberships"
  ON company_users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role IN ('owner', 'admin')
    )
  );

-- Fix company_invitations policies
DROP POLICY IF EXISTS "Company admins can manage invitations" ON company_invitations;

CREATE POLICY "Company admins can view invitations"
  ON company_invitations
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can create invitations"
  ON company_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can delete invitations"
  ON company_invitations
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role IN ('owner', 'admin')
    )
  );

-- Create function to handle user invitation acceptance
CREATE OR REPLACE FUNCTION accept_company_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record company_invitations%ROWTYPE;
  result JSON;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM company_invitations
  WHERE invitation_token = accept_company_invitation.invitation_token
    AND accepted_at IS NULL
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user email matches
  IF invitation_record.email != (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;
  
  -- Add user to company
  INSERT INTO company_users (company_id, user_id, role)
  VALUES (invitation_record.company_id, auth.uid(), invitation_record.role);
  
  -- Mark invitation as accepted
  UPDATE company_invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  -- Update user profile with company info
  UPDATE profiles
  SET current_company_id = invitation_record.company_id
  WHERE id = auth.uid() AND current_company_id IS NULL;
  
  RETURN json_build_object('success', true, 'company_id', invitation_record.company_id);
END;
$$;