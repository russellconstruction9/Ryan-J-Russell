/*
  # Create calendar events table

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `customer_id` (uuid, optional foreign key to customers)
      - `subcontractor_id` (uuid, optional foreign key to subcontractors)
      - `title` (text, required)
      - `description` (text, optional)
      - `event_date` (date, required)
      - `event_time` (time, required)
      - `event_type` (text, required - estimate, work_order, meeting, inspection)
      - `status` (text, required - scheduled, completed, cancelled, rescheduled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `calendar_events` table
    - Add policies for users to manage their own events

  3. Indexes
    - Add indexes for performance on user_id and event_date
*/

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('estimate', 'work_order', 'meeting', 'inspection')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calendar events" 
  ON public.calendar_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events" 
  ON public.calendar_events 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events" 
  ON public.calendar_events 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events" 
  ON public.calendar_events 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id 
  ON public.calendar_events(user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date 
  ON public.calendar_events(event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id 
  ON public.calendar_events(customer_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_subcontractor_id 
  ON public.calendar_events(subcontractor_id);