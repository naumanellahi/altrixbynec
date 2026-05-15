import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Users, GraduationCap, MapPin, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", is_active: true });

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

  // Per-campus KPIs (students + staff)
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

  const reset = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", is_active: true });
  };

  const startEdit = (c: Campus) => {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code || "",
      address: c.address || "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!schoolId || !form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload = {
      school_id: schoolId,
      name: form.name.trim(),
      code: form.code.trim() || null,
      address: form.address.trim() || null,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("campuses").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
      toast({ title: "Campus updated" });
    } else {
      const { error } = await supabase.from("campuses").insert(payload);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Campus created" });
    }
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["owner_campuses_list", schoolId] });
    qc.invalidateQueries({ queryKey: ["owner_campuses_kpis", schoolId] });
  };

  const toggleActive = async (c: Campus) => {
    await supabase.from("campuses").update({ is_active: !c.is_active }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["owner_campuses_list", schoolId] });
  };

  const total = campuses.length;
  const active = campuses.filter((c) => c.is_active).length;
  const totalStudents = Object.values(kpis).reduce((s, v) => s + v.students, 0);
  const totalStaff = Object.values(kpis).reduce((s, v) => s + v.staff, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Multi-Campus View</h1>
          <p className="text-muted-foreground">Campus comparison, rankings, and performance benchmarking</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={reset}><Plus className="h-4 w-4 mr-1.5" /> New campus</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit campus" : "Create campus"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAIN" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}><Check className="h-4 w-4 mr-1.5" />{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">No campuses yet. Create one to start segmenting students, staff, fees and analytics.</CardContent></Card>
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
                    <div className="flex items-center gap-1">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)} aria-label="Edit campus">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
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
