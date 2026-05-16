import { useQuery } from "@tanstack/react-query";
import { Building2, Users, GraduationCap, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  schoolId: string | null;
}

interface Campus {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_active: boolean;
  principal_user_id: string | null;
}

export function OwnerCampusesModule({ schoolId }: Props) {
  const { data: campuses = [], isLoading } = useQuery({
    queryKey: ["owner_campuses_list", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("campuses")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");
      return (data || []) as Campus[];
    },
    enabled: !!schoolId,
  });

  const { data: kpis = {} } = useQuery({
    queryKey: ["owner_campuses_kpis", schoolId],
    queryFn: async () => {
      if (!schoolId) return {};
      const [studentsRes, staffRes] = await Promise.all([
        supabase.from("students").select("campus_id").eq("school_id", schoolId),
        supabase.from("staff_campus_assignments").select("campus_id"),
      ]);
      const map: Record<string, { students: number; staff: number }> = {};
      (studentsRes.data || []).forEach((s: any) => {
        const k = s.campus_id || "_none";
        map[k] = map[k] || { students: 0, staff: 0 };
        map[k].students++;
      });
      (staffRes.data || []).forEach((s: any) => {
        const k = s.campus_id || "_none";
        map[k] = map[k] || { students: 0, staff: 0 };
        map[k].staff++;
      });
      return map;
    },
    enabled: !!schoolId,
  });

  const total = campuses.length;
  const active = campuses.filter((c) => c.is_active).length;
  const totalStudents = Object.values(kpis).reduce((s, v) => s + v.students, 0);
  const totalStaff = Object.values(kpis).reduce((s, v) => s + v.staff, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Multi-Campus View</h1>
          <p className="text-muted-foreground">
            Read-only overview across all your schools and campuses. New schools and campuses can only be created by the platform super admin.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Building2 className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total Campuses</p></CardContent></Card>
        <Card><CardContent className="p-4"><Building2 className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4"><GraduationCap className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Students (all campuses)</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-purple-600" /><p className="mt-2 font-display text-2xl font-bold">{totalStaff}</p><p className="text-xs text-muted-foreground">Campus-assigned Staff</p></CardContent></Card>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : campuses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No campuses configured for this school yet. Ask the platform super admin to add one.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {campuses.map((c) => {
            const k = kpis[c.id] || { students: 0, staff: 0 };
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {c.code && <Badge variant="outline" className="h-5 text-[10px]">{c.code}</Badge>}
                        {c.address && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {c.address}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant={c.is_active ? "default" : "outline"} className="h-5 text-[10px]">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-0">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Students</p>
                    <p className="font-display text-xl font-semibold">{k.students}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Staff</p>
                    <p className="font-display text-xl font-semibold">{k.staff}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
