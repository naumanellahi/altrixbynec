import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, HeartPulse, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCampus } from "@/hooks/useActiveCampus";

interface Props { schoolId: string | null; }

export function OwnerWellbeingModule({ schoolId }: Props) {
  const activeCampusId = useActiveCampus(schoolId);
  const campusEq = (q: any) => (activeCampusId ? q.eq("campus_id", activeCampusId) : q);

  const { data } = useQuery({
    queryKey: ["owner_wellbeing", schoolId, activeCampusId],
    enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return null;
      const [behaviorRes, complaintsRes, studentsRes] = await Promise.all([
        campusEq(supabase.from("behavior_notes").select("id,severity").eq("school_id", schoolId)),
        campusEq(supabase.from("complaints").select("id,status").eq("school_id", schoolId)),
        campusEq(supabase.from("students").select("id").eq("school_id", schoolId)),
      ]);
      const behavior = behaviorRes.data || [];
      const complaints = complaintsRes.data || [];
      const students = studentsRes.data || [];
      const incidents = behavior.filter((b: any) => ["high", "critical", "severe"].includes((b.severity || "").toLowerCase())).length;
      const openComplaints = complaints.filter((c: any) => c.status !== "resolved" && c.status !== "closed").length;
      const dropoutRisk = students.length > 0 && incidents / students.length > 0.1 ? "High" : incidents / Math.max(1, students.length) > 0.05 ? "Medium" : "Low";
      const wellbeing = incidents === 0 ? "Excellent" : incidents < 5 ? "Good" : "Needs Attention";
      return { incidents, openComplaints, behaviorCount: behavior.length, dropoutRisk, wellbeing };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Student Wellbeing & Safety</h1>
        <p className="text-muted-foreground">Welfare tracking, behavior analytics, and safety monitoring{activeCampusId ? " (campus-scoped)" : ""}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><HeartPulse className="h-5 w-5 text-pink-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.wellbeing ?? "—"}</p><p className="text-xs text-muted-foreground">Overall Wellbeing</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.behaviorCount ?? 0}</p><p className="text-xs text-muted-foreground">Behavior Notes</p></CardContent></Card>
        <Card><CardContent className="p-4"><AlertTriangle className="h-5 w-5 text-amber-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.incidents ?? 0}</p><p className="text-xs text-muted-foreground">Serious Incidents</p></CardContent></Card>
        <Card><CardContent className="p-4"><Activity className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.dropoutRisk ?? "Low"}</p><p className="text-xs text-muted-foreground">Dropout Risk</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Open complaints</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-display font-bold">{data?.openComplaints ?? 0}</p><p className="text-sm text-muted-foreground">Pending resolution</p></CardContent>
      </Card>
    </div>
  );
}
