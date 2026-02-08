import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Campus {
  id: string;
  school_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  principal_user_id: string | null;
  is_active: boolean;
  is_main: boolean;
  student_capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCampusAssignment {
  id: string;
  school_id: string;
  campus_id: string;
  user_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface CampusFormData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  principal_user_id?: string;
  is_active?: boolean;
  is_main?: boolean;
  student_capacity?: number;
}

export function useCampuses(schoolId: string | null) {
  const qc = useQueryClient();

  const campusesQuery = useQuery({
    queryKey: ["campuses", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("campuses" as any)
        .select("*")
        .eq("school_id", schoolId)
        .order("is_main", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as Campus[];
    },
    enabled: !!schoolId,
  });

  const staffAssignmentsQuery = useQuery({
    queryKey: ["staff_campus_assignments", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("staff_campus_assignments" as any)
        .select("*")
        .eq("school_id", schoolId);
      if (error) throw error;
      return (data || []) as StaffCampusAssignment[];
    },
    enabled: !!schoolId,
  });

  const createCampus = useMutation({
    mutationFn: async (form: CampusFormData) => {
      if (!schoolId) throw new Error("No school");
      const { data, error } = await supabase
        .from("campuses" as any)
        .insert({ ...form, school_id: schoolId })
        .select()
        .single();
      if (error) throw error;
      return data as Campus;
    },
    onSuccess: () => {
      toast.success("Campus created successfully");
      qc.invalidateQueries({ queryKey: ["campuses", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCampus = useMutation({
    mutationFn: async ({ id, ...form }: CampusFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("campuses" as any)
        .update(form)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Campus;
    },
    onSuccess: () => {
      toast.success("Campus updated");
      qc.invalidateQueries({ queryKey: ["campuses", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCampus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campuses" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campus deleted");
      qc.invalidateQueries({ queryKey: ["campuses", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignStaff = useMutation({
    mutationFn: async ({ campusId, userId, isPrimary }: { campusId: string; userId: string; isPrimary?: boolean }) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase
        .from("staff_campus_assignments" as any)
        .upsert(
          { school_id: schoolId, campus_id: campusId, user_id: userId, is_primary: isPrimary ?? false },
          { onConflict: "campus_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff assigned to campus");
      qc.invalidateQueries({ queryKey: ["staff_campus_assignments", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStaffAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_campus_assignments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff removed from campus");
      qc.invalidateQueries({ queryKey: ["staff_campus_assignments", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    campuses: campusesQuery.data || [],
    isLoading: campusesQuery.isLoading,
    staffAssignments: staffAssignmentsQuery.data || [],
    staffLoading: staffAssignmentsQuery.isLoading,
    createCampus,
    updateCampus,
    deleteCampus,
    assignStaff,
    removeStaffAssignment,
    refetch: () => {
      qc.invalidateQueries({ queryKey: ["campuses", schoolId] });
      qc.invalidateQueries({ queryKey: ["staff_campus_assignments", schoolId] });
    },
  };
}
