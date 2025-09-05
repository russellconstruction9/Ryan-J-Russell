import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  settings?: any;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';
  subscription_plan: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  permissions?: any;
  invited_by?: string;
  joined_at: string;
  last_active_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  company?: Company;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  company_id?: string;
  current_company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
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
  company_id: string;
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
  company_id: string;
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
  company_id: string;
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

export interface BudgetVersion {
  id: string;
  estimate_id: string;
  company_id: string;
  version_number: number;
  budget_data?: any;
  reconciled_data?: any;
  notes?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  company_id: string;
  customer_id?: string;
  subcontractor_id?: string;
  title: string;
  description?: string;
  event_date: string;
  event_time: string;
  event_type: 'estimate' | 'work_order' | 'meeting' | 'inspection';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
  customer?: Customer;
  subcontractor?: Subcontractor;
}