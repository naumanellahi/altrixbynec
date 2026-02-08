
-- student_guardians doesn't have school_id directly, so the DO block skipped it
-- Add policies via parent student's school_id
CREATE POLICY "Members read student_guardians" ON public.student_guardians
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_guardians.student_id
    AND is_school_member(auth.uid(), s.school_id)
  ));
CREATE POLICY "Staff write student_guardians" ON public.student_guardians
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_guardians.student_id
    AND is_school_member(auth.uid(), s.school_id)
  ));
CREATE POLICY "Staff update student_guardians" ON public.student_guardians
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_guardians.student_id
    AND is_school_member(auth.uid(), s.school_id)
  ));
CREATE POLICY "Staff delete student_guardians" ON public.student_guardians
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_guardians.student_id
    AND is_school_member(auth.uid(), s.school_id)
  ));
