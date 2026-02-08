
-- ========================================
-- EDUVERSE COMPLETE DATABASE SCHEMA
-- ========================================

-- ===== UTILITY FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== CORE: SCHOOLS =====
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== CORE: PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== CORE: SCHOOL MEMBERSHIPS =====
CREATE TABLE public.school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, user_id)
);
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

-- ===== CORE: USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== CORE: PLATFORM SUPER ADMINS =====
CREATE TABLE public.platform_super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_super_admins ENABLE ROW LEVEL SECURITY;

-- ===== CORE: SCHOOL BRANDING =====
CREATE TABLE public.school_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  accent_hue NUMERIC,
  accent_saturation NUMERIC,
  accent_lightness NUMERIC,
  radius_scale NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.school_branding ENABLE ROW LEVEL SECURITY;

-- ===== ACADEMICS: CLASSES =====
CREATE TABLE public.academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;

-- ===== ACADEMICS: SECTIONS =====
CREATE TABLE public.class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room TEXT,
  campus_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;

-- ===== ACADEMICS: SUBJECTS =====
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- ===== ACADEMICS: SECTION-SUBJECT MAPPING =====
CREATE TABLE public.class_section_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, class_section_id, subject_id)
);
ALTER TABLE public.class_section_subjects ENABLE ROW LEVEL SECURITY;

-- ===== STUDENTS =====
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  status TEXT DEFAULT 'active',
  profile_id UUID,
  campus_id UUID,
  date_of_birth DATE,
  gender TEXT,
  admission_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ===== STUDENT ENROLLMENTS =====
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- ===== STUDENT GUARDIANS =====
CREATE TABLE public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- ===== TEACHER ASSIGNMENTS =====
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, teacher_user_id, class_section_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- ===== ATTENDANCE SESSIONS =====
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  period_label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- ===== ATTENDANCE ENTRIES =====
CREATE TABLE public.attendance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, session_id, student_id)
);
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;

-- ===== TIMETABLE PERIODS =====
CREATE TABLE public.timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  start_time TIME,
  end_time TIME,
  is_break BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;

-- ===== TIMETABLE ENTRIES =====
CREATE TABLE public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.timetable_periods(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL,
  subject_name TEXT,
  teacher_user_id UUID REFERENCES auth.users(id),
  room TEXT,
  start_time TIME,
  end_time TIME,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- ===== TIMETABLE SETTINGS =====
CREATE TABLE public.timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

-- ===== TEACHER PERIOD LOGS =====
CREATE TABLE public.teacher_period_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  logged_at DATE NOT NULL,
  topic_covered TEXT DEFAULT '',
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, timetable_entry_id, logged_at)
);
ALTER TABLE public.teacher_period_logs ENABLE ROW LEVEL SECURITY;

-- ===== ASSESSMENTS =====
CREATE TABLE public.academic_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assessment_date DATE,
  max_marks NUMERIC DEFAULT 100,
  is_published BOOLEAN DEFAULT false,
  term_label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.academic_assessments ENABLE ROW LEVEL SECURITY;

-- ===== STUDENT MARKS =====
CREATE TABLE public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.academic_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks NUMERIC,
  computed_grade TEXT,
  grade_points NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, assessment_id, student_id)
);
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;

-- ===== GRADE THRESHOLDS =====
CREATE TABLE public.grade_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_label TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  grade_points NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.grade_thresholds ENABLE ROW LEVEL SECURITY;

-- ===== HOMEWORK =====
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'active',
  attachment_urls TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- ===== ASSIGNMENTS =====
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  max_marks NUMERIC,
  status TEXT DEFAULT 'active',
  attachment_urls TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- ===== ASSIGNMENT SUBMISSIONS =====
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT,
  attachment_urls TEXT[],
  marks NUMERIC,
  feedback TEXT,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- ===== BEHAVIOR NOTES =====
CREATE TABLE public.behavior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT DEFAULT 'general',
  is_shared_with_parents BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;

-- ===== STUDENT CERTIFICATES =====
CREATE TABLE public.student_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  certificate_type TEXT,
  issued_date DATE DEFAULT CURRENT_DATE,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: INVOICES =====
CREATE TABLE public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_no TEXT,
  subtotal NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: INVOICE LINE ITEMS =====
CREATE TABLE public.finance_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: PAYMENT METHODS =====
CREATE TABLE public.finance_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'cash',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: PAYMENTS =====
CREATE TABLE public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ DEFAULT now(),
  reference TEXT,
  method_id UUID REFERENCES public.finance_payment_methods(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: EXPENSES =====
CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  vendor TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: FEE PLANS =====
CREATE TABLE public.fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'PKR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;

-- ===== FINANCE: FEE PLAN INSTALLMENTS =====
CREATE TABLE public.fee_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_plan_id UUID NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fee_plan_installments ENABLE ROW LEVEL SECURITY;

-- ===== HR: SALARY RECORDS =====
CREATE TABLE public.hr_salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  currency TEXT DEFAULT 'PKR',
  pay_frequency TEXT DEFAULT 'monthly',
  notes TEXT,
  month INTEGER,
  year INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_salary_records ENABLE ROW LEVEL SECURITY;

-- ===== HR: PAY RUNS =====
CREATE TABLE public.hr_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_pay_runs ENABLE ROW LEVEL SECURITY;

-- ===== HR: SALARY BUDGET TARGETS =====
CREATE TABLE public.salary_budget_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fiscal_year INTEGER,
  role TEXT,
  department TEXT,
  budget_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.salary_budget_targets ENABLE ROW LEVEL SECURITY;

-- ===== HR: LEAVE TYPES =====
CREATE TABLE public.hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_days INTEGER,
  is_paid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;

-- ===== HR: LEAVE REQUESTS =====
CREATE TABLE public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES public.hr_leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

-- ===== HR: CONTRACTS =====
CREATE TABLE public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_type TEXT DEFAULT 'permanent',
  start_date DATE,
  end_date DATE,
  position TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;

-- ===== HR: DOCUMENTS =====
CREATE TABLE public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

-- ===== HR: REVIEWS =====
CREATE TABLE public.hr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_date DATE DEFAULT CURRENT_DATE,
  rating NUMERIC,
  comments TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_reviews ENABLE ROW LEVEL SECURITY;

-- ===== MESSAGING: ADMIN MESSAGES =====
CREATE TABLE public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'sent',
  priority TEXT DEFAULT 'normal',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- ===== MESSAGING: ADMIN MESSAGE RECIPIENTS =====
CREATE TABLE public.admin_message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_message_recipients ENABLE ROW LEVEL SECURITY;

-- ===== MESSAGING: PARENT MESSAGES =====
CREATE TABLE public.parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id),
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

-- ===== MESSAGING: WORKSPACE MESSAGES =====
CREATE TABLE public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_message_id UUID REFERENCES public.workspace_messages(id),
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;

-- ===== MESSAGING: SCHEDULED MESSAGES =====
CREATE TABLE public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_ids UUID[] NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- ===== NOTIFICATIONS =====
CREATE TABLE public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- ===== NOTIFICATION PREFERENCES =====
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, user_id, channel, category)
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ===== PARENT NOTIFICATIONS =====
CREATE TABLE public.parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  notification_type TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- ===== SUPPORT =====
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- ===== CRM: PIPELINES =====
CREATE TABLE public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;

-- ===== CRM: STAGES =====
CREATE TABLE public.crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

-- ===== CRM: LEADS =====
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  status TEXT DEFAULT 'new',
  stage_id UUID REFERENCES public.crm_stages(id),
  pipeline_id UUID REFERENCES public.crm_pipelines(id),
  score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id),
  next_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- ===== CRM: LEAD SOURCES =====
CREATE TABLE public.crm_lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_lead_sources ENABLE ROW LEVEL SECURITY;

-- ===== CRM: ACTIVITIES =====
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  summary TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- ===== CRM: CALL LOGS =====
CREATE TABLE public.crm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  called_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER,
  outcome TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_call_logs ENABLE ROW LEVEL SECURITY;

-- ===== CRM: FOLLOW UPS =====
CREATE TABLE public.crm_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;

-- ===== CRM: CAMPAIGNS =====
CREATE TABLE public.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT,
  status TEXT DEFAULT 'draft',
  budget NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;

-- ===== CAMPUSES =====
CREATE TABLE public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  principal_user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON public.campuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== STAFF CAMPUS ASSIGNMENTS =====
CREATE TABLE public.staff_campus_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id, user_id)
);
ALTER TABLE public.staff_campus_assignments ENABLE ROW LEVEL SECURITY;

-- Add campus_id foreign keys
ALTER TABLE public.class_sections ADD CONSTRAINT fk_class_sections_campus FOREIGN KEY (campus_id) REFERENCES public.campuses(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD CONSTRAINT fk_students_campus FOREIGN KEY (campus_id) REFERENCES public.campuses(id) ON DELETE SET NULL;

-- ===== AI TABLES =====
CREATE TABLE public.ai_student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  learning_style TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  personality_type TEXT,
  risk_level TEXT DEFAULT 'low',
  last_analyzed_at TIMESTAMPTZ,
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_student_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_early_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  description TEXT,
  recommended_actions TEXT[],
  status TEXT DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_early_warnings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_counseling_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reason TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_counseling_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_teacher_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score NUMERIC,
  attendance_score NUMERIC,
  engagement_score NUMERIC,
  results_score NUMERIC,
  feedback TEXT,
  analysis_data JSONB DEFAULT '{}',
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_teacher_performance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_school_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  overall_score NUMERIC,
  academic_score NUMERIC,
  parent_satisfaction NUMERIC,
  community_score NUMERIC,
  strengths TEXT[],
  improvements TEXT[],
  analysis_data JSONB DEFAULT '{}',
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_school_reputation ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_academic_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  predicted_grade TEXT,
  confidence NUMERIC,
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_academic_predictions ENABLE ROW LEVEL SECURITY;

-- ===== VIEW: SCHOOL USER DIRECTORY =====
CREATE OR REPLACE VIEW public.school_user_directory AS
SELECT
  sm.school_id,
  sm.user_id,
  COALESCE(p.display_name, u.email) AS display_name,
  u.email
FROM public.school_memberships sm
JOIN auth.users u ON u.id = sm.user_id
LEFT JOIN public.profiles p ON p.id = sm.user_id;

-- ===== RPC FUNCTIONS =====

-- Get school by slug (public, no auth required)
CREATE OR REPLACE FUNCTION public.get_school_public_by_slug(_slug TEXT)
RETURNS TABLE(id UUID, slug TEXT, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.slug, s.name
  FROM public.schools s
  WHERE s.slug = _slug AND s.is_active = true
  LIMIT 1;
$$;

-- List school user profiles
CREATE OR REPLACE FUNCTION public.list_school_user_profiles(_school_id UUID)
RETURNS TABLE(user_id UUID, display_name TEXT, email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sm.user_id, COALESCE(p.display_name, u.email), u.email
  FROM public.school_memberships sm
  JOIN auth.users u ON u.id = sm.user_id
  LEFT JOIN public.profiles p ON p.id = sm.user_id
  WHERE sm.school_id = _school_id;
$$;

-- My children (for parents)
CREATE OR REPLACE FUNCTION public.my_children(_school_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sg.student_id
  FROM public.student_guardians sg
  JOIN public.students s ON s.id = sg.student_id AND s.school_id = _school_id
  WHERE sg.user_id = auth.uid();
$$;

-- Is my child (for parents)
CREATE OR REPLACE FUNCTION public.is_my_child(_school_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    JOIN public.students s ON s.id = sg.student_id AND s.school_id = _school_id
    WHERE sg.user_id = auth.uid() AND sg.student_id = _student_id
  );
$$;

-- Has role check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _school_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND school_id = _school_id AND role = _role
  );
$$;

-- Is school member check
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE user_id = _user_id AND school_id = _school_id
  );
$$;

-- Is platform super admin check
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_super_admins WHERE user_id = _user_id
  );
$$;

-- ===== RLS POLICIES =====

-- Schools: everyone can read active schools, members can manage
CREATE POLICY "Anyone can view active schools" ON public.schools FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins manage schools" ON public.schools FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- School memberships
CREATE POLICY "Members can view school memberships" ON public.school_memberships FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admins manage memberships" ON public.school_memberships FOR ALL TO authenticated USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), school_id, 'super_admin') OR has_role(auth.uid(), school_id, 'school_owner'));

-- User roles
CREATE POLICY "Members can view roles" ON public.user_roles FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), school_id, 'super_admin') OR has_role(auth.uid(), school_id, 'school_owner'));

-- Platform super admins
CREATE POLICY "Super admins can view" ON public.platform_super_admins FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- School branding
CREATE POLICY "Members can view branding" ON public.school_branding FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Owners manage branding" ON public.school_branding FOR ALL TO authenticated USING (has_role(auth.uid(), school_id, 'school_owner') OR has_role(auth.uid(), school_id, 'super_admin'));

-- School-scoped tables: members can read, staff can write
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'academic_classes', 'class_sections', 'subjects', 'class_section_subjects',
    'students', 'student_enrollments', 'teacher_assignments',
    'attendance_sessions', 'attendance_entries',
    'timetable_periods', 'timetable_entries', 'timetable_settings', 'teacher_period_logs',
    'academic_assessments', 'student_marks', 'grade_thresholds',
    'homework', 'assignments', 'assignment_submissions', 'behavior_notes',
    'student_certificates', 'student_guardians',
    'finance_invoices', 'finance_invoice_items', 'finance_payment_methods',
    'finance_payments', 'finance_expenses', 'fee_plans', 'fee_plan_installments',
    'hr_salary_records', 'hr_pay_runs', 'salary_budget_targets',
    'hr_leave_types', 'hr_leave_requests', 'hr_contracts', 'hr_documents', 'hr_reviews',
    'admin_messages', 'admin_message_recipients', 'parent_messages',
    'workspace_messages', 'scheduled_messages',
    'app_notifications', 'notification_preferences', 'parent_notifications',
    'support_conversations', 'support_messages',
    'crm_pipelines', 'crm_stages', 'crm_leads', 'crm_lead_sources',
    'crm_activities', 'crm_call_logs', 'crm_follow_ups', 'crm_campaigns',
    'campuses', 'staff_campus_assignments',
    'ai_student_profiles', 'ai_early_warnings', 'ai_counseling_queue',
    'ai_teacher_performance', 'ai_school_reputation', 'ai_academic_predictions'
  ]
  LOOP
    -- Check if table has school_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'school_id'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Members read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (is_school_member(auth.uid(), school_id))',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "Staff write %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (is_school_member(auth.uid(), school_id))',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "Staff update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (is_school_member(auth.uid(), school_id))',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "Staff delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (is_school_member(auth.uid(), school_id))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- Special policies for tables without school_id
CREATE POLICY "Members read admin_message_recipients" ON public.admin_message_recipients FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Staff write admin_message_recipients" ON public.admin_message_recipients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update admin_message_recipients" ON public.admin_message_recipients FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid());

CREATE POLICY "Members read staff_campus_assignments" ON public.staff_campus_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage staff_campus_assignments" ON public.staff_campus_assignments FOR ALL TO authenticated USING (true);

CREATE POLICY "Read own finance_invoice_items" ON public.finance_invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write finance_invoice_items" ON public.finance_invoice_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update finance_invoice_items" ON public.finance_invoice_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Delete finance_invoice_items" ON public.finance_invoice_items FOR DELETE TO authenticated USING (true);

-- ===== INDEXES =====
CREATE INDEX idx_school_memberships_school ON public.school_memberships(school_id);
CREATE INDEX idx_school_memberships_user ON public.school_memberships(user_id);
CREATE INDEX idx_user_roles_school ON public.user_roles(school_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_students_school ON public.students(school_id);
CREATE INDEX idx_students_campus ON public.students(campus_id);
CREATE INDEX idx_academic_classes_school ON public.academic_classes(school_id);
CREATE INDEX idx_class_sections_school ON public.class_sections(school_id);
CREATE INDEX idx_class_sections_class ON public.class_sections(class_id);
CREATE INDEX idx_class_sections_campus ON public.class_sections(campus_id);
CREATE INDEX idx_student_enrollments_school ON public.student_enrollments(school_id);
CREATE INDEX idx_student_enrollments_student ON public.student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_section ON public.student_enrollments(class_section_id);
CREATE INDEX idx_attendance_sessions_school ON public.attendance_sessions(school_id);
CREATE INDEX idx_attendance_entries_session ON public.attendance_entries(session_id);
CREATE INDEX idx_attendance_entries_student ON public.attendance_entries(student_id);
CREATE INDEX idx_timetable_entries_school ON public.timetable_entries(school_id);
CREATE INDEX idx_timetable_entries_section ON public.timetable_entries(class_section_id);
CREATE INDEX idx_teacher_assignments_school ON public.teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_user_id);
CREATE INDEX idx_homework_school ON public.homework(school_id);
CREATE INDEX idx_assignments_school ON public.assignments(school_id);
CREATE INDEX idx_student_marks_school ON public.student_marks(school_id);
CREATE INDEX idx_student_marks_assessment ON public.student_marks(assessment_id);
CREATE INDEX idx_admin_messages_school ON public.admin_messages(school_id);
CREATE INDEX idx_admin_message_recipients_user ON public.admin_message_recipients(recipient_user_id);
CREATE INDEX idx_admin_message_recipients_message ON public.admin_message_recipients(message_id);
CREATE INDEX idx_finance_invoices_school ON public.finance_invoices(school_id);
CREATE INDEX idx_finance_invoices_student ON public.finance_invoices(student_id);
CREATE INDEX idx_finance_payments_school ON public.finance_payments(school_id);
CREATE INDEX idx_finance_expenses_school ON public.finance_expenses(school_id);
CREATE INDEX idx_crm_leads_school ON public.crm_leads(school_id);
CREATE INDEX idx_campuses_school ON public.campuses(school_id);
CREATE INDEX idx_app_notifications_user ON public.app_notifications(user_id);
CREATE INDEX idx_app_notifications_school ON public.app_notifications(school_id);

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_message_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_campus_assignments;
