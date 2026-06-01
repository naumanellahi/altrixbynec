import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, AlertTriangle, FileText } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.ceil((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

export function HrContractsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", contract_type: "full_time", position: "", department: "", start_date: today(), end_date: "", status: "active" });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hr_contracts_full", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_contracts").select("*").eq("school_id", schoolId!).order("end_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["hr_staff_dir_contracts", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_school_staff_directory", { _school_id: schoolId! });
      if (error) throw error;
      return data || [];
    },
  });
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (staff as any[]).forEach((s) => m.set(s.user_id, s.display_name || s.email));
    return m;
  }, [staff]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hr_contracts").insert({
        school_id: schoolId,
        user_id: form.user_id,
        contract_type: form.contract_type,
        position: form.position || null,
        department: form.department || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contract added"); qc.invalidateQueries({ queryKey: ["hr_contracts_full"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const t = today();
  const expiringSoon = contracts.filter((c: any) => c.end_date && c.status === "active" && daysBetween(c.end_date, t) >= 0 && daysBetween(c.end_date, t) <= 60);
  const expired = contracts.filter((c: any) => c.end_date && daysBetween(c.end_date, t) < 0 && c.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Contracts</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Employee</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(staff as any[]).map((s) => (<SelectItem key={s.user_id} value={s.user_id}>{s.display_name || s.email}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Position</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End (optional)</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.user_id || create.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="font-medium">Contract Alerts</p></div>
            <div className="text-sm space-y-1">
              {expired.length > 0 && <p><span className="font-medium text-destructive">{expired.length}</span> expired contract(s) still marked active.</p>}
              {expiringSoon.length > 0 && <p><span className="font-medium text-amber-600">{expiringSoon.length}</span> contract(s) expiring within 60 days.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringSoon.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
        </TabsList>
        {[
          { v: "all", list: contracts },
          { v: "expiring", list: expiringSoon },
          { v: "expired", list: expired },
        ].map((tab) => (
          <TabsContent key={tab.v} value={tab.v} className="space-y-2 mt-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!isLoading && tab.list.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
            {tab.list.map((c: any) => {
              const dleft = c.end_date ? daysBetween(c.end_date, t) : null;
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{nameById.get(c.user_id) || c.user_id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{c.position || c.contract_type}{c.department ? ` · ${c.department}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{c.start_date} → {c.end_date || "Ongoing"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {dleft !== null && dleft >= 0 && dleft <= 60 && <Badge variant="outline" className="border-amber-500 text-amber-600">{dleft}d left</Badge>}
                      {dleft !== null && dleft < 0 && <Badge variant="destructive">Expired</Badge>}
                      <Badge variant="outline" className="capitalize">{c.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
