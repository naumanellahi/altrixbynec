import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  examId: string;
  examName: string;
  canManage: boolean;
}

interface Row {
  id: string;
  subject_id: string | null;
  class_section_id: string | null;
  exam_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  max_marks: number | null;
  passing_marks: number | null;
  room: string | null;
  instructions: string | null;
  invigilator_user_id: string | null;
}

export default function ExamDatesheetDialog({ open, onOpenChange, schoolId, examId, examName, canManage }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_name?: string }[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!open) return;
    setLoading(true);
    const [subs, secs, ds, dir] = await Promise.all([
      (supabase as any).from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
      (supabase as any).from("class_sections").select("id,name,class_id,academic_classes(name)").eq("school_id", schoolId),
      (supabase as any).from("exam_subjects").select("*").eq("exam_id", examId).order("exam_date").order("start_time"),
      (supabase as any).rpc("get_school_user_directory", { _school_id: schoolId }),
    ]);
    setSubjects(subs.data || []);
    setSections((secs.data || []).map((s: any) => ({ id: s.id, name: s.name, class_name: s.academic_classes?.name })));
    setRows(ds.data || []);
    setStaff((dir.data || []).map((d: any) => ({ user_id: d.user_id, display_name: d.display_name })));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [open, examId]);

  const addRow = async () => {
    const { data, error } = await (supabase as any)
      .from("exam_subjects")
      .insert({ school_id: schoolId, exam_id: examId, max_marks: 100, passing_marks: 40, duration_minutes: 60 })
      .select().single();
    if (error) return toast.error(error.message);
    setRows((r) => [...r, data]);
  };

  const updateRow = async (id: string, patch: Partial<Row>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await (supabase as any).from("exam_subjects").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("exam_subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Paper removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Datesheet — {examName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <Button size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" />Add paper</Button>
            </div>
          )}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Dur (min)</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Pass</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Invigilator</TableHead>
                  {canManage && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No papers yet. {canManage && "Click \"Add paper\" to build the datesheet."}
                  </TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-[160px]">
                      <Select disabled={!canManage} value={r.subject_id ?? ""} onValueChange={(v) => updateRow(r.id, { subject_id: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Select disabled={!canManage} value={r.class_section_id ?? ""} onValueChange={(v) => updateRow(r.id, { class_section_id: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.class_name ? `${s.class_name} — ` : ""}{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input disabled={!canManage} type="date" className="h-8 w-[140px]" value={r.exam_date ?? ""} onChange={(e) => updateRow(r.id, { exam_date: e.target.value })} /></TableCell>
                    <TableCell><Input disabled={!canManage} type="time" className="h-8 w-[110px]" value={r.start_time ?? ""} onChange={(e) => updateRow(r.id, { start_time: e.target.value })} /></TableCell>
                    <TableCell><Input disabled={!canManage} type="number" className="h-8 w-[80px]" value={r.duration_minutes ?? ""} onChange={(e) => updateRow(r.id, { duration_minutes: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input disabled={!canManage} type="number" className="h-8 w-[70px]" value={r.max_marks ?? ""} onChange={(e) => updateRow(r.id, { max_marks: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input disabled={!canManage} type="number" className="h-8 w-[70px]" value={r.passing_marks ?? ""} onChange={(e) => updateRow(r.id, { passing_marks: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input disabled={!canManage} className="h-8 w-[100px]" placeholder="Room" value={r.room ?? ""} onChange={(e) => updateRow(r.id, { room: e.target.value })} /></TableCell>
                    <TableCell className="min-w-[160px]">
                      <Select disabled={!canManage} value={r.invigilator_user_id ?? ""} onValueChange={(v) => updateRow(r.id, { invigilator_user_id: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    {canManage && <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {rows.length} paper{rows.length !== 1 && "s"} · Edits save automatically.
            </p>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
