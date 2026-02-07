-- Migrate existing Academic Coordinator users to School Admin
UPDATE public.user_roles
SET role = 'school_admin'
WHERE role = 'academic_coordinator';

-- Update permission helper functions
CREATE OR REPLACE FUNCTION public.can_manage_staff(_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_platform_super_admin()
  or (
    public.has_role(_school_id, 'super_admin')
    or public.has_role(_school_id, 'school_owner')
    or public.has_role(_school_id, 'principal')
    or public.has_role(_school_id, 'vice_principal')
    or public.has_role(_school_id, 'school_admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_finance(_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_platform_super_admin()
  or public.can_manage_staff(_school_id)
  or public.has_role(_school_id, 'accountant');
$function$;

CREATE OR REPLACE FUNCTION public.can_message_user(_school_id uuid, _sender_id uuid, _recipient_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_role text;
  recipient_role text;
BEGIN
  SELECT role::text INTO sender_role
  FROM user_roles
  WHERE school_id = _school_id AND user_id = _sender_id
  ORDER BY CASE 
    WHEN role IN ('principal', 'vice_principal', 'super_admin', 'school_owner', 'school_admin') THEN 1
    WHEN role IN ('teacher', 'accountant', 'hr_manager', 'marketing_staff', 'counselor') THEN 2
    WHEN role = 'parent' THEN 3
    WHEN role = 'student' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  SELECT role::text INTO recipient_role
  FROM user_roles
  WHERE school_id = _school_id AND user_id = _recipient_id
  ORDER BY CASE 
    WHEN role IN ('principal', 'vice_principal', 'super_admin', 'school_owner', 'school_admin') THEN 1
    WHEN role IN ('teacher', 'accountant', 'hr_manager', 'marketing_staff', 'counselor') THEN 2
    WHEN role = 'parent' THEN 3
    WHEN role = 'student' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  IF sender_role = 'student' THEN
    RETURN recipient_role IN ('teacher', 'principal', 'vice_principal', 'super_admin', 'school_owner', 'school_admin', 'counselor');
  END IF;
  
  RETURN true;
END;
$function$;