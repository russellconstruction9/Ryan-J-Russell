/*
  # Multi-Tenant SaaS Schema Update

  This migration transforms the application into a multi-tenant SaaS where:
  1. Companies can have multiple users
  2. Users within a company share the same data
  3. Data is isolated between different companies
  4. Company admins can manage users and billing

  ## New Tables
  - `companies` - Company/organization records
  - `company_users` - Junction table for company-user relationships
  - `company_invitations` - Pending user invitations
  - `company_subscriptions` - Billing and subscription management

  ## Updated Tables
  - All existing tables now reference `company_id` instead of `user_id`
  - RLS policies updated for company-based access control

  ## Security
  - Row Level Security ensures data isolation between companies
  - Role-based permissions within companies
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  domain text,
  logo_url text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  website text,
  industry text,
  company_size text,
  settings jsonb DEFAULT '{}',
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')),
  subscription_plan text DEFAULT 'starter',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create company_users junction table
CREATE TABLE IF NOT EXISTS company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  permissions jsonb DEFAULT '{}',
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Create company invitations table
CREATE TABLE IF NOT EXISTS company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invitation_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Create company subscriptions table for billing
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_name text NOT NULL,
  plan_price numeric(10,2),
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update profiles table to include company relationship
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_company_id uuid REFERENCES companies(id);

-- Update existing tables to use company_id instead of user_id for data ownership
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE insurance_estimates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE estimate_documents ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company_id ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(invitation_token);

-- Add company_id indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_company_id ON subcontractors(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_estimates_company_id ON insurance_estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_company_id ON estimate_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_company_id ON calendar_events(company_id);

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's current company
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id 
  FROM company_users 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

-- Helper function to check if user has role in company
CREATE OR REPLACE FUNCTION user_has_company_role(company_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE user_id = auth.uid() 
      AND company_id = company_uuid 
      AND is_active = true
      AND (
        role = required_role 
        OR (required_role = 'member' AND role IN ('owner', 'admin', 'manager', 'member'))
        OR (required_role = 'manager' AND role IN ('owner', 'admin', 'manager'))
        OR (required_role = 'admin' AND role IN ('owner', 'admin'))
        OR (required_role = 'owner' AND role = 'owner')
      )
  );
$$;

-- RLS Policies for companies
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

CREATE POLICY "Company owners and admins can update company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (user_has_company_role(id, 'admin'))
  WITH CHECK (user_has_company_role(id, 'admin'));

-- RLS Policies for company_users
CREATE POLICY "Users can view company members"
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

CREATE POLICY "Company admins can manage users"
  ON company_users
  FOR ALL
  TO authenticated
  USING (user_has_company_role(company_id, 'admin'))
  WITH CHECK (user_has_company_role(company_id, 'admin'));

-- RLS Policies for company_invitations
CREATE POLICY "Company admins can manage invitations"
  ON company_invitations
  FOR ALL
  TO authenticated
  USING (user_has_company_role(company_id, 'admin'))
  WITH CHECK (user_has_company_role(company_id, 'admin'));

-- RLS Policies for company_subscriptions
CREATE POLICY "Company owners can view subscriptions"
  ON company_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_has_company_role(company_id, 'owner'));

CREATE POLICY "Company owners can manage subscriptions"
  ON company_subscriptions
  FOR ALL
  TO authenticated
  USING (user_has_company_role(company_id, 'owner'))
  WITH CHECK (user_has_company_role(company_id, 'owner'));

-- Update RLS policies for existing tables to use company-based access

-- Customers policies
DROP POLICY IF EXISTS "Users can manage own customers" ON customers;
CREATE POLICY "Company users can manage company customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Subcontractors policies
DROP POLICY IF EXISTS "Users can manage own subcontractors" ON subcontractors;
CREATE POLICY "Company users can manage company subcontractors"
  ON subcontractors
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Insurance estimates policies
DROP POLICY IF EXISTS "Users can manage own estimates" ON insurance_estimates;
CREATE POLICY "Company users can manage company estimates"
  ON insurance_estimates
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Work orders policies
DROP POLICY IF EXISTS "Users can manage own work orders" ON work_orders;
CREATE POLICY "Company users can manage company work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Estimate documents policies
DROP POLICY IF EXISTS "Users can manage own estimate documents" ON estimate_documents;
CREATE POLICY "Company users can manage company estimate documents"
  ON estimate_documents
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Calendar events policies
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view their own calendar events" ON calendar_events;

CREATE POLICY "Company users can manage company calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Profiles policies update
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle new user signup and company creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();