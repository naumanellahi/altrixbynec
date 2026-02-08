
-- Add missing columns to AI tables that code expects

-- ai_student_profiles: add risk_score, needs_counseling
ALTER TABLE public.ai_student_profiles ADD COLUMN IF NOT EXISTS risk_score NUMERIC DEFAULT 0;
ALTER TABLE public.ai_student_profiles ADD COLUMN IF NOT EXISTS needs_counseling BOOLEAN DEFAULT false;

-- ai_teacher_performance: add needs_training
ALTER TABLE public.ai_teacher_performance ADD COLUMN IF NOT EXISTS needs_training BOOLEAN DEFAULT false;

-- ai_academic_predictions: add failure_risk
ALTER TABLE public.ai_academic_predictions ADD COLUMN IF NOT EXISTS failure_risk NUMERIC DEFAULT 0;

-- ai_school_reputation: add reputation_score, parent_satisfaction_index, nps_score
ALTER TABLE public.ai_school_reputation ADD COLUMN IF NOT EXISTS reputation_score NUMERIC DEFAULT 0;
ALTER TABLE public.ai_school_reputation ADD COLUMN IF NOT EXISTS parent_satisfaction_index NUMERIC DEFAULT 0;
ALTER TABLE public.ai_school_reputation ADD COLUMN IF NOT EXISTS nps_score NUMERIC DEFAULT 0;

-- ai_counseling_queue: add reason_type, reason_details, detected_indicators, scheduled_date, session_notes, outcome
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS reason_type TEXT;
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS reason_details TEXT;
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS detected_indicators TEXT[];
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE public.ai_counseling_queue ADD COLUMN IF NOT EXISTS outcome TEXT;

-- ai_early_warnings: add title, detected_patterns, acknowledged_at
ALTER TABLE public.ai_early_warnings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.ai_early_warnings ADD COLUMN IF NOT EXISTS detected_patterns TEXT[];
ALTER TABLE public.ai_early_warnings ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- profiles: add user_id alias column (some code expects it)
-- Actually profiles.id IS the user_id. Let's add it for queries that select user_id.
-- profiles: add email and bio
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create missing ai_parent_updates table
CREATE TABLE IF NOT EXISTS public.ai_parent_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES auth.users(id),
  update_type TEXT DEFAULT 'general',
  content TEXT,
  attendance_status TEXT,
  participation_level TEXT,
  focus_trend TEXT,
  ai_summary TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_parent_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ai_parent_updates" ON public.ai_parent_updates FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff write ai_parent_updates" ON public.ai_parent_updates FOR INSERT TO authenticated WITH CHECK (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff update ai_parent_updates" ON public.ai_parent_updates FOR UPDATE TO authenticated USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff delete ai_parent_updates" ON public.ai_parent_updates FOR DELETE TO authenticated USING (is_school_member(auth.uid(), school_id));
