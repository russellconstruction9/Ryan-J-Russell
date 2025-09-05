/*
  # Add customer estimates and work orders tracking

  1. New Tables
    - Updates to existing tables to better track customer relationships
    
  2. Security
    - Maintain existing RLS policies
    
  3. Changes
    - Add customer relationship to insurance_estimates
    - Ensure work_orders link properly to estimates and customers
*/

-- Add customer_id to insurance_estimates if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_estimates' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE insurance_estimates ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_insurance_estimates_customer_id ON insurance_estimates(customer_id);
  END IF;
END $$;

-- Update work_orders to ensure proper relationships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
  END IF;
END $$;