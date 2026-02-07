-- Student-scoped read access helpers + policies for Student shell + finance access for principals/VP/owners

-- Helper: is the current logged-in student enrolled in a given section?
CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_section(_school_id uuid, _class_section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    WHERE se.school_id = _school_id
      AND se.class_section_id = _class_section_id
      AND se.student_id = public.my_student_id(_school_id)
  );
$$;

-- =====================
-- Core reference tables (safe reads for any school user)
-- =====================
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School users can read academic classes" ON public.academic_classes;
CREATE POLICY "School users can read academic classes"
ON public.academic_classes
FOR SELECT
TO authenticated
USING (public.is_school_user(school_id));

DROP POLICY IF EXISTS "School users can read class sections" ON public.class_sections;
CREATE POLICY "School users can read class sections"
ON public.class_sections
FOR SELECT
TO authenticated
USING (public.is_school_user(school_id));

DROP POLICY IF EXISTS "School users can read subjects" ON public.subjects;
CREATE POLICY "School users can read subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (public.is_school_user(school_id));

DROP POLICY IF EXISTS "School users can read timetable periods" ON public.timetable_periods;
CREATE POLICY "School users can read timetable periods"
ON public.timetable_periods
FOR SELECT
TO authenticated
USING (public.is_school_user(school_id));

-- =====================
-- Student enrollments & student data scoping
-- =====================
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;

-- Student can read own enrollments
DROP POLICY IF EXISTS "Students can read their enrollments" ON public.student_enrollments;
CREATE POLICY "Students can read their enrollments"
ON public.student_enrollments
FOR SELECT
TO authenticated
USING (public.is_my_student(school_id, student_id));

-- Student can read timetable entries for their enrolled section(s)
DROP POLICY IF EXISTS "Students can read their timetable" ON public.timetable_entries;
CREATE POLICY "Students can read their timetable"
ON public.timetable_entries
FOR SELECT
TO authenticated
USING (public.is_student_enrolled_in_section(school_id, class_section_id));

-- Student can read assignments for their enrolled section(s)
DROP POLICY IF EXISTS "Students can read their assignments" ON public.assignments;
CREATE POLICY "Students can read their assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (public.is_student_enrolled_in_section(school_id, class_section_id));

-- Student can read homework for their enrolled section(s)
DROP POLICY IF EXISTS "Students can read their homework" ON public.homework;
CREATE POLICY "Students can read their homework"
ON public.homework
FOR SELECT
TO authenticated
USING (public.is_student_enrolled_in_section(school_id, class_section_id));

-- Student can read attendance sessions for their enrolled section(s)
DROP POLICY IF EXISTS "Students can read their attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Students can read their attendance sessions"
ON public.attendance_sessions
FOR SELECT
TO authenticated
USING (public.is_student_enrolled_in_section(school_id, class_section_id));

-- Student can read their attendance entries
DROP POLICY IF EXISTS "Students can read their attendance" ON public.attendance_entries;
CREATE POLICY "Students can read their attendance"
ON public.attendance_entries
FOR SELECT
TO authenticated
USING (public.is_my_student(school_id, student_id));

-- Student can read assessments for their enrolled section(s)
DROP POLICY IF EXISTS "Students can read their assessments" ON public.academic_assessments;
CREATE POLICY "Students can read their assessments"
ON public.academic_assessments
FOR SELECT
TO authenticated
USING (public.is_student_enrolled_in_section(school_id, class_section_id));

-- Student can read their marks
DROP POLICY IF EXISTS "Students can read their marks" ON public.student_marks;
CREATE POLICY "Students can read their marks"
ON public.student_marks
FOR SELECT
TO authenticated
USING (public.is_my_student(school_id, student_id));

-- =====================
-- Finance access (principal/VP/owner/school_admin/accountant via can_manage_finance)
-- =====================
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

-- SELECT
DROP POLICY IF EXISTS "Finance managers can read fee plans" ON public.fee_plans;
CREATE POLICY "Finance managers can read fee plans"
ON public.fee_plans
FOR SELECT TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can read payment methods" ON public.finance_payment_methods;
CREATE POLICY "Finance managers can read payment methods"
ON public.finance_payment_methods
FOR SELECT TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can read invoices" ON public.finance_invoices;
CREATE POLICY "Finance managers can read invoices"
ON public.finance_invoices
FOR SELECT TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can read payments" ON public.finance_payments;
CREATE POLICY "Finance managers can read payments"
ON public.finance_payments
FOR SELECT TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can read expenses" ON public.finance_expenses;
CREATE POLICY "Finance managers can read expenses"
ON public.finance_expenses
FOR SELECT TO authenticated
USING (public.can_manage_finance(school_id));

-- INSERT
DROP POLICY IF EXISTS "Finance managers can create fee plans" ON public.fee_plans;
CREATE POLICY "Finance managers can create fee plans"
ON public.fee_plans
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can create payment methods" ON public.finance_payment_methods;
CREATE POLICY "Finance managers can create payment methods"
ON public.finance_payment_methods
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can create invoices" ON public.finance_invoices;
CREATE POLICY "Finance managers can create invoices"
ON public.finance_invoices
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can create payments" ON public.finance_payments;
CREATE POLICY "Finance managers can create payments"
ON public.finance_payments
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can create expenses" ON public.finance_expenses;
CREATE POLICY "Finance managers can create expenses"
ON public.finance_expenses
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_finance(school_id));

-- UPDATE
DROP POLICY IF EXISTS "Finance managers can update fee plans" ON public.fee_plans;
CREATE POLICY "Finance managers can update fee plans"
ON public.fee_plans
FOR UPDATE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can update payment methods" ON public.finance_payment_methods;
CREATE POLICY "Finance managers can update payment methods"
ON public.finance_payment_methods
FOR UPDATE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can update invoices" ON public.finance_invoices;
CREATE POLICY "Finance managers can update invoices"
ON public.finance_invoices
FOR UPDATE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can update payments" ON public.finance_payments;
CREATE POLICY "Finance managers can update payments"
ON public.finance_payments
FOR UPDATE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can update expenses" ON public.finance_expenses;
CREATE POLICY "Finance managers can update expenses"
ON public.finance_expenses
FOR UPDATE TO authenticated
USING (public.can_manage_finance(school_id));

-- DELETE
DROP POLICY IF EXISTS "Finance managers can delete fee plans" ON public.fee_plans;
CREATE POLICY "Finance managers can delete fee plans"
ON public.fee_plans
FOR DELETE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can delete payment methods" ON public.finance_payment_methods;
CREATE POLICY "Finance managers can delete payment methods"
ON public.finance_payment_methods
FOR DELETE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can delete invoices" ON public.finance_invoices;
CREATE POLICY "Finance managers can delete invoices"
ON public.finance_invoices
FOR DELETE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can delete payments" ON public.finance_payments;
CREATE POLICY "Finance managers can delete payments"
ON public.finance_payments
FOR DELETE TO authenticated
USING (public.can_manage_finance(school_id));

DROP POLICY IF EXISTS "Finance managers can delete expenses" ON public.finance_expenses;
CREATE POLICY "Finance managers can delete expenses"
ON public.finance_expenses
FOR DELETE TO authenticated
USING (public.can_manage_finance(school_id));
