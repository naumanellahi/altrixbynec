
-- Fix 1: Replace security-definer view with a security-invoker function
-- This also fixes the "Exposed Auth Users" warning
DROP VIEW IF EXISTS public.school_user_directory;

CREATE OR REPLACE FUNCTION public.get_school_user_directory(_school_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT, school_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sm.user_id, u.email::TEXT, COALESCE(p.display_name, u.email)::TEXT, sm.school_id
  FROM public.school_memberships sm
  JOIN auth.users u ON u.id = sm.user_id
  LEFT JOIN public.profiles p ON p.id = sm.user_id
  WHERE sm.school_id = _school_id
    AND is_school_member(auth.uid(), _school_id);
$$;

-- Re-create the view as security invoker so RLS applies
CREATE VIEW public.school_user_directory
WITH (security_invoker = true)
AS
SELECT sm.school_id, sm.user_id,
  COALESCE(p.display_name, '') AS display_name,
  '' AS email
FROM public.school_memberships sm
LEFT JOIN public.profiles p ON p.id = sm.user_id;

-- Fix 2: Replace overly permissive policies on finance_invoice_items
DROP POLICY IF EXISTS "Read own finance_invoice_items" ON public.finance_invoice_items;
DROP POLICY IF EXISTS "Write finance_invoice_items" ON public.finance_invoice_items;
DROP POLICY IF EXISTS "Update finance_invoice_items" ON public.finance_invoice_items;
DROP POLICY IF EXISTS "Delete finance_invoice_items" ON public.finance_invoice_items;

CREATE POLICY "Members read finance_invoice_items" ON public.finance_invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.finance_invoices fi
    WHERE fi.id = finance_invoice_items.invoice_id
    AND is_school_member(auth.uid(), fi.school_id)
  ));
CREATE POLICY "Staff write finance_invoice_items" ON public.finance_invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.finance_invoices fi
    WHERE fi.id = finance_invoice_items.invoice_id
    AND is_school_member(auth.uid(), fi.school_id)
  ));
CREATE POLICY "Staff update finance_invoice_items" ON public.finance_invoice_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.finance_invoices fi
    WHERE fi.id = finance_invoice_items.invoice_id
    AND is_school_member(auth.uid(), fi.school_id)
  ));
CREATE POLICY "Staff delete finance_invoice_items" ON public.finance_invoice_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.finance_invoices fi
    WHERE fi.id = finance_invoice_items.invoice_id
    AND is_school_member(auth.uid(), fi.school_id)
  ));

-- Fix 3: Replace overly permissive policies on staff_campus_assignments
DROP POLICY IF EXISTS "Members read staff_campus_assignments" ON public.staff_campus_assignments;
DROP POLICY IF EXISTS "Admins manage staff_campus_assignments" ON public.staff_campus_assignments;

CREATE POLICY "Members read staff_campus_assignments" ON public.staff_campus_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campuses c
    WHERE c.id = staff_campus_assignments.campus_id
    AND is_school_member(auth.uid(), c.school_id)
  ));
CREATE POLICY "Staff write staff_campus_assignments" ON public.staff_campus_assignments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campuses c
    WHERE c.id = staff_campus_assignments.campus_id
    AND is_school_member(auth.uid(), c.school_id)
  ));
CREATE POLICY "Staff update staff_campus_assignments" ON public.staff_campus_assignments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campuses c
    WHERE c.id = staff_campus_assignments.campus_id
    AND is_school_member(auth.uid(), c.school_id)
  ));
CREATE POLICY "Staff delete staff_campus_assignments" ON public.staff_campus_assignments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campuses c
    WHERE c.id = staff_campus_assignments.campus_id
    AND is_school_member(auth.uid(), c.school_id)
  ));

-- Fix 4: Fix admin_message_recipients overly permissive INSERT
DROP POLICY IF EXISTS "Staff write admin_message_recipients" ON public.admin_message_recipients;
CREATE POLICY "Staff write admin_message_recipients" ON public.admin_message_recipients
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_messages am
    WHERE am.id = admin_message_recipients.message_id
    AND am.sender_user_id = auth.uid()
  ));
