import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Holiday {
  id: string; title: string; description: string | null;
  start_date: string; end_date: string; holiday_type: string;
}

interface Props { schoolId: string | null; canManage?: boolean; }

export default function HolidaysModule({ schoolId, canManage = false }: Props) {
  const { user } = useSession();
  const [items, setItems] = useState<Holiday[]>([]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ title: "", description: "", start_date: today, end_date: today, holiday_type: "public" });

  const load = async () => {
    if (!schoolId) return;
    const { data } = await (supabase as any).from("holidays").select("*").eq("school_id", schoolId).order("start_date", { ascending: true });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [schoolId]);

  const submit = async () => {
    if (!schoolId || !user) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await (supabase as any).from("holidays").insert({ school_id: schoolId, ...form, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Holiday added");
    setForm({ title: "", description: "", start_date: today, end_date: today, holiday_type: "public" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("holidays").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Holidays</h2>
          <p className="text-sm text-muted-foreground">School calendar of holidays & breaks</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add holiday</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add holiday</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title (e.g. Eid Holiday)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Start</label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">End</label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <Select value={form.holiday_type} onValueChange={(v) => setForm({ ...form, holiday_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public Holiday</SelectItem>
                    <SelectItem value="school">School Holiday</SelectItem>
                    <SelectItem value="exam_break">Exam Break</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto h-10 w-10 opacity-50" />
          <p className="mt-3">No holidays scheduled.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{h.title}</p>
                    <Badge variant="outline" className="text-[10px]">{h.holiday_type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(h.start_date), "MMM d, yyyy")}
                    {h.start_date !== h.end_date && ` → ${format(new Date(h.end_date), "MMM d, yyyy")}`}
                  </p>
                  {h.description && <p className="mt-2 text-sm">{h.description}</p>}
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
