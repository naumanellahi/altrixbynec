import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subDays } from "date-fns";
import type { Campus } from "./useCampuses";

export interface CampusAnalytics {
  campusId: string;
  campusName: string;
  campusCode: string;
  studentCount: number;
  staffCount: number;
  attendanceRate: number;
  revenueThisMonth: number;
  avgMarks: number;
  sectionCount: number;
}

export function useCampusAnalytics(schoolId: string | null, campuses: Campus[]) {
  return useQuery({
    queryKey: ["campus_analytics", schoolId, campuses.map((c) => c.id).join(",")],
    queryFn: async (): Promise<CampusAnalytics[]> => {
      if (!schoolId || campuses.length === 0) return [];

      const monthStart = startOfMonth(new Date()).toISOString();
      const d7Ago = subDays(new Date(), 7).toISOString();

      const results: CampusAnalytics[] = [];

      for (const campus of campuses) {
        const [
          studentsRes,
          staffRes,
          sectionsRes,
          attendanceRes,
          paymentsRes,
          marksRes,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("campus_id" as any, campus.id),
          supabase
            .from("staff_campus_assignments" as any)
            .select("id", { count: "exact", head: true })
            .eq("campus_id", campus.id),
          supabase
            .from("class_sections")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("campus_id" as any, campus.id),
          supabase
            .from("attendance_entries")
            .select("status")
            .eq("school_id", schoolId)
            .gte("created_at", d7Ago),
          supabase
            .from("finance_payments")
            .select("amount")
            .eq("school_id", schoolId)
            .gte("paid_at", monthStart),
          supabase
            .from("student_marks")
            .select("marks")
            .eq("school_id", schoolId)
            .not("marks", "is", null),
        ]);

        const studentCount = studentsRes.count || 0;
        const staffCount = staffRes.count || 0;
        const sectionCount = sectionsRes.count || 0;

        const attendance = attendanceRes.data || [];
        const present = attendance.filter(
          (a: any) => a.status === "present" || a.status === "late"
        ).length;
        const attendanceRate =
          attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

        const payments = paymentsRes.data || [];
        const revenueThisMonth = payments.reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0),
          0
        );

        const marks = marksRes.data || [];
        const avgMarks =
          marks.length > 0
            ? Math.round(
                marks.reduce((sum: number, m: any) => sum + Number(m.marks || 0), 0) /
                  marks.length
              )
            : 0;

        results.push({
          campusId: campus.id,
          campusName: campus.name,
          campusCode: campus.code,
          studentCount,
          staffCount,
          attendanceRate,
          revenueThisMonth,
          avgMarks,
          sectionCount,
        });
      }

      return results;
    },
    enabled: !!schoolId && campuses.length > 0,
  });
}
