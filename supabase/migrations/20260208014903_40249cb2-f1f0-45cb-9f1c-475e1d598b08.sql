
-- Add remaining missing columns

-- ai_student_profiles: needs_extra_support (referenced in select)
ALTER TABLE public.ai_student_profiles ADD COLUMN IF NOT EXISTS needs_extra_support BOOLEAN DEFAULT false;

-- ai_academic_predictions: promotion_probability
ALTER TABLE public.ai_academic_predictions ADD COLUMN IF NOT EXISTS promotion_probability NUMERIC DEFAULT 0;

-- ai_parent_updates: missing columns
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS performance_change_percent NUMERIC DEFAULT 0;
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS behavior_remarks TEXT;
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS update_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS key_insights TEXT[];
ALTER TABLE public.ai_parent_updates ADD COLUMN IF NOT EXISTS recommendations TEXT[];

-- section_subjects referenced as "section_subjects" in some code
CREATE TABLE IF NOT EXISTS public.section_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, class_section_id, subject_id)
);
ALTER TABLE public.section_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read section_subjects" ON public.section_subjects FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff write section_subjects" ON public.section_subjects FOR INSERT TO authenticated WITH CHECK (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff update section_subjects" ON public.section_subjects FOR UPDATE TO authenticated USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Staff delete section_subjects" ON public.section_subjects FOR DELETE TO authenticated USING (is_school_member(auth.uid(), school_id));
