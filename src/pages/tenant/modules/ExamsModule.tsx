import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Exam { id: string; name: string; term_label: string | null; start_date: string | null; end_date: string | null; status: string; }

interface Props { schoolId: string | null; canManage?: boolean; }

export default function ExamsModule({ schoolId, canManage = false }: Props) {
  const { user } = useSession();
  const [items, setItems] = useState<Exam[]>([]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: "", term_label: "", start_date: today, end_date: today, status: "scheduled" });

  const load = async () => {
    if (!schoolId) return;
    const { data } = await (supabase as any).from("exams").select("*").eq("school_id", schoolId).order("start_date", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [schoolId]);

  const submit = async () => {
    if (!schoolId || !user) return;
    if (!form.name.trim()) return toast.error("Name required");
    const { error } = await (supabase as any).from("exams").insert({ school_id: schoolId, ...form, created_by: user.id });
    if (error) return toast.error(error.message);
    toast.success("Exam created"); setOpen(false); load();
    setForm({ name: "", term_label: "", start_date: today, end_date: today, status: "scheduled" });
  };
  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("exams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const statusColor = (s: string) => s === "completed" ? "default" : s === "ongoing" ? "destructive" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-display text-2xl font-semibold">Exams</h2>
        <p className="text-sm text-muted-foreground">Exam schedules and results</p></div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New exam</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create exam</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Exam name (e.g. Mid-Term 2026)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Term label (e.g. Term 1)" value={form.term_label} onChange={(e) => setForm({ ...form, term_label: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto h-10 w-10 opacity-50" /><p className="mt-3">No exams scheduled.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{e.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={statusColor(e.status) as any} className="text-[10px]">{e.status}</Badge>
                      {e.term_label && <Badge variant="outline" className="text-[10px]">{e.term_label}</Badge>}
                    </div>
                  </div>
                  {canManage && <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {e.start_date && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.start_date), "MMM d, yyyy")}
                    {e.end_date && e.end_date !== e.start_date && ` → ${format(new Date(e.end_date), "MMM d, yyyy")}`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
