import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Subcontractor {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  specialty: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  license_number?: string;
  insurance_info?: string;
  notes?: string;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsuranceEstimate {
  id: string;
  user_id: string;
  customer_id?: string;
  file_name: string;
  file_url?: string;
  definitive_total?: number;
  budget_data?: any;
  reconciled_data?: any;
  status: string;
  claim_number?: string;
  date_of_loss?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface WorkOrder {
  id: string;
  user_id: string;
  estimate_id: string;
  subcontractor_id?: string;
  work_order_number: string;
  category: string;
  scope_of_work: string;
  material_amount: number;
  labor_amount: number;
  total_amount: number;
  timeline?: string;
  special_requirements?: string;
  status: string;
  generated_content?: string;
  created_at: string;
  updated_at: string;
  subcontractor?: Subcontractor;
  estimate?: InsuranceEstimate;
}