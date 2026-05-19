import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, CalendarDays, AlertTriangle, FileDown, Send, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ALL_FIELDS, buildDatesheetPDF, DatesheetField } from "./datesheetPdf";

const SECTION_ALL = "__all";

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
  const { user } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_name?: string }[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [exportSection, setExportSection] = useState<string>(SECTION_ALL);
  const [schoolName, setSchoolName] = useState<string>("");
  const [sending, setSending] = useState(false);

  // PDF options
  const [fields, setFields] = useState<DatesheetField[]>(ALL_FIELDS.filter((f) => f.default).map((f) => f.key));
  const [paperQR, setPaperQR] = useState(false);
  const [hallTicketQR, setHallTicketQR] = useState(true);


  const loadConflicts = async () => {
    const { data } = await (supabase as any).rpc("check_exam_subject_conflicts", { _school_id: schoolId, _exam_id: examId });
    setConflicts(data || []);
  };

  const load = async () => {
    if (!open) return;
    setLoading(true);
    const [subs, secs, ds, dir, sch] = await Promise.all([
      (supabase as any).from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
      (supabase as any).from("class_sections").select("id,name,class_id,academic_classes(name)").eq("school_id", schoolId),
      (supabase as any).from("exam_subjects").select("*").eq("exam_id", examId).order("exam_date").order("start_time"),
      (supabase as any).rpc("get_school_user_directory", { _school_id: schoolId }),
      (supabase as any).from("schools").select("name").eq("id", schoolId).maybeSingle(),
    ]);
    setSubjects(subs.data || []);
    setSections((secs.data || []).map((s: any) => ({ id: s.id, name: s.name, class_name: s.academic_classes?.name })));
    setRows(ds.data || []);
    setStaff((dir.data || []).map((d: any) => ({ user_id: d.user_id, display_name: d.display_name })));
    setSchoolName(sch.data?.name || "");
    setLoading(false);
    loadConflicts();
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [open, examId]);

  const conflictIds = useMemo(() => {
    const s = new Set<string>();
    conflicts.forEach((c: any) => { s.add(c.a_id); s.add(c.b_id); });
    return s;
  }, [conflicts]);

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
    else loadConflicts();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("exam_subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Paper removed");
    loadConflicts();
  };

  const lookups = useMemo(() => ({
    subjects: new Map(subjects.map((s) => [s.id, s.name])),
    sections: new Map(sections.map((s) => [s.id, `${s.class_name ? s.class_name + " — " : ""}${s.name}`])),
    staff: new Map(staff.map((s) => [s.user_id, s.display_name])),
  }), [subjects, sections, staff]);

  const exportPdf = async () => {
    const filtered = exportSection === SECTION_ALL ? rows : rows.filter((r) => r.class_section_id === exportSection);
    if (filtered.length === 0) return toast.error("No papers to export");
    if (fields.length === 0) return toast.error("Pick at least one column");
    const sectionLabel = exportSection === SECTION_ALL ? undefined : lookups.sections.get(exportSection);
    const doc = await buildDatesheetPDF(filtered, { schoolName, examName, sectionLabel }, { fields, includePaperQR: paperQR }, lookups);
    doc.save(`datesheet-${examName.replace(/\s+/g, "_")}${sectionLabel ? "-" + sectionLabel.replace(/\s+/g, "_") : ""}.pdf`);
    toast.success("Datesheet exported");
  };

  const sendToParents = async () => {
    if (fields.length === 0) return toast.error("Pick at least one column");
    setSending(true);
    try {
      const sectionIds = Array.from(new Set(rows.map((r) => r.class_section_id).filter(Boolean))) as string[];
      if (sectionIds.length === 0) { toast.error("No papers with sections assigned"); return; }
      const { data: enrolls, error: eErr } = await (supabase as any)
        .from("student_enrollments")
        .select("student_id,class_section_id,students!inner(id,first_name,last_name,student_code,school_id)")
        .in("class_section_id", sectionIds)
        .is("end_date", null)
        .eq("school_id", schoolId);
      if (eErr) throw eErr;
      const students = (enrolls || []) as any[];
      if (students.length === 0) { toast.error("No enrolled students found"); return; }

      let success = 0; let failed = 0;
      for (const en of students) {
        const studentRows = rows.filter((r) => r.class_section_id === en.class_section_id);
        if (studentRows.length === 0) continue;
        const secLabel = lookups.sections.get(en.class_section_id);
        const studentLabel = `${en.students.first_name} ${en.students.last_name}`;
        const hallTicketUrl = `${window.location.origin}/student/exams/${examId}/hall-ticket/${en.student_id}`;
        try {
          const doc = await buildDatesheetPDF(studentRows, {
            schoolName, examName, sectionLabel: secLabel,
            studentLabel, studentCode: en.students.student_code,
            hallTicketUrl: hallTicketQR ? hallTicketUrl : undefined,
          }, { fields, includePaperQR: paperQR, includeHallTicketQR: hallTicketQR }, lookups);
          const blob = doc.output("blob");
          const path = `${schoolId}/${examId}/${en.student_id}.pdf`;
          const { error: upErr } = await (supabase as any).storage.from("exam-datesheets").upload(path, blob, {
            upsert: true, contentType: "application/pdf",
          });
          if (upErr) throw upErr;
          await (supabase as any).from("exam_datesheet_distributions").upsert({
            school_id: schoolId, exam_id: examId, student_id: en.student_id,
            class_section_id: en.class_section_id, file_path: path, generated_by: user?.id ?? null,
            generated_at: new Date().toISOString(),
          }, { onConflict: "exam_id,student_id" } as any);

          const { data: guards } = await (supabase as any)
            .from("student_guardians").select("user_id").eq("student_id", en.student_id).not("user_id", "is", null);
          for (const g of (guards || []) as any[]) {
            await (supabase as any).from("app_notifications").insert({
              school_id: schoolId, user_id: g.user_id, type: "exam_datesheet",
              title: `Datesheet ready: ${examName}`,
              body: `Download ${studentLabel}'s exam datesheet from the Datesheets section.`,
              entity_type: "exam", entity_id: examId,
            });
          }
          success++;
        } catch (err: any) {
          console.error("send fail", en.student_id, err);
          failed++;
        }
      }
      toast.success(`Sent to ${success} student${success !== 1 ? "s" : ""}${failed ? ` (${failed} failed)` : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally { setSending(false); }
  };

  const toggleField = (k: DatesheetField) =>
    setFields((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));





  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Datesheet — {examName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={exportSection} onValueChange={setExportSection}>
                <SelectTrigger className="h-8 w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECTION_ALL}>All classes/sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.class_name ? `${s.class_name} — ` : ""}{s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline"><Settings2 className="mr-1 h-4 w-4" />PDF options</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Columns</p>
                  <div className="space-y-1.5">
                    {ALL_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={fields.includes(f.key)} onCheckedChange={() => toggleField(f.key)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 border-t pt-3 space-y-1.5">
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">QR codes</p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={paperQR} onCheckedChange={(v) => setPaperQR(!!v)} /> Per-paper QR
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={hallTicketQR} onCheckedChange={(v) => setHallTicketQR(!!v)} /> Hall ticket link QR
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" variant="outline" onClick={exportPdf}>
                <FileDown className="mr-1 h-4 w-4" />Export PDF
              </Button>
              {canManage && (
                <Button size="sm" variant="default" disabled={sending} onClick={sendToParents}>
                  <Send className="mr-1 h-4 w-4" />{sending ? "Sending…" : "Send to parents"}
                </Button>
              )}
            </div>
            {canManage && (
              <Button size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" />Add paper</Button>
            )}
          </div>


          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{conflicts.length} scheduling conflict{conflicts.length !== 1 && "s"} detected</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5">
                  {conflicts.slice(0, 5).map((c: any, i: number) => (
                    <li key={i}>
                      {c.conflict_type === "room" ? `Room "${c.room}"` : "Invigilator"} double-booked on {c.exam_date} ({c.a_start?.slice(0,5)}–{c.a_end?.slice(0,5)} vs {c.b_start?.slice(0,5)}–{c.b_end?.slice(0,5)})
                    </li>
                  ))}
                  {conflicts.length > 5 && <li>…and {conflicts.length - 5} more</li>}
                </ul>
              </AlertDescription>
            </Alert>
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
                  <TableRow key={r.id} className={conflictIds.has(r.id) ? "bg-destructive/5" : undefined}>
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
