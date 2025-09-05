/*
  # Initial Schema Setup for Insurance Budget Reconciler

  1. New Tables
    - `profiles` - User profile information
    - `customers` - Customer information and projects
    - `subcontractors` - Preferred subcontractors with contact info
    - `insurance_estimates` - Uploaded PDF estimates and budget data
    - `work_orders` - Generated work orders linked to estimates
    - `estimate_documents` - Additional documents per estimate

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Customers can only see their own projects
    - Subcontractors are user-specific
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Subcontractors table
CREATE TABLE IF NOT EXISTS subcontractors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  specialty text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  license_number text,
  insurance_info text,
  notes text,
  is_preferred boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subcontractors"
  ON subcontractors
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insurance estimates table
CREATE TABLE IF NOT EXISTS insurance_estimates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text,
  definitive_total numeric(12,2),
  budget_data jsonb,
  reconciled_data jsonb,
  status text DEFAULT 'processed',
  claim_number text,
  date_of_loss date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own estimates"
  ON insurance_estimates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estimate_id uuid REFERENCES insurance_estimates(id) ON DELETE CASCADE NOT NULL,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,
  work_order_number text NOT NULL,
  category text NOT NULL,
  scope_of_work text NOT NULL,
  material_amount numeric(10,2) DEFAULT 0,
  labor_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  timeline text,
  special_requirements text,
  status text DEFAULT 'draft',
  generated_content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Estimate documents table (for additional files)
CREATE TABLE IF NOT EXISTS estimate_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estimate_id uuid REFERENCES insurance_estimates(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text,
  document_type text DEFAULT 'other',
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE estimate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own estimate documents"
  ON estimate_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id ON subcontractors(user_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_specialty ON subcontractors(specialty);
CREATE INDEX IF NOT EXISTS idx_insurance_estimates_user_id ON insurance_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_estimates_customer_id ON insurance_estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_user_id ON work_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_estimate_id ON work_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_estimate_id ON estimate_documents(estimate_id);

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();