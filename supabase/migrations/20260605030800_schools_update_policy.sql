-- Policy to allow school principals and owners to update school configuration details (e.g. coordinates/geofence)
DROP POLICY IF EXISTS "Principal and owners can update school info" ON public.schools;
CREATE POLICY "Principal and owners can update school info"
ON public.schools FOR UPDATE
TO authenticated
USING (
  public.has_role(id, 'super_admin')
  OR public.has_role(id, 'school_owner')
  OR public.has_role(id, 'principal')
);
