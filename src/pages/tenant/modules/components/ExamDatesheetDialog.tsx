import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, CalendarDays, AlertTriangle, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [rows, setRows] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_name?: string }[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [exportSection, setExportSection] = useState<string>(SECTION_ALL);
  const [schoolName, setSchoolName] = useState<string>("");

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

  const exportPdf = () => {
    const filtered = exportSection === SECTION_ALL
      ? rows
      : rows.filter((r) => r.class_section_id === exportSection);
    if (filtered.length === 0) return toast.error("No papers to export");
    const subjMap = new Map(subjects.map((s) => [s.id, s.name]));
    const secMap = new Map(sections.map((s) => [s.id, `${s.class_name ? s.class_name + " — " : ""}${s.name}`]));
    const staffMap = new Map(staff.map((s) => [s.user_id, s.display_name]));

    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(schoolName || "Datesheet", pageW / 2, 14, { align: "center" });
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text(`Exam Datesheet — ${examName}`, pageW / 2, 21, { align: "center" });
    if (exportSection !== SECTION_ALL) {
      doc.setFontSize(10);
      doc.text(`Class/Section: ${secMap.get(exportSection) || ""}`, pageW / 2, 27, { align: "center" });
    }

    const body = filtered
      .slice()
      .sort((a, b) => (a.exam_date || "").localeCompare(b.exam_date || "") || (a.start_time || "").localeCompare(b.start_time || ""))
      .map((r) => [
        r.exam_date ? format(new Date(r.exam_date), "EEE, MMM d, yyyy") : "—",
        r.start_time ?? "—",
        r.duration_minutes ? `${r.duration_minutes} min` : "—",
        subjMap.get(r.subject_id || "") || "—",
        secMap.get(r.class_section_id || "") || "—",
        r.room || "—",
        r.max_marks?.toString() || "—",
        r.passing_marks?.toString() || "—",
        staffMap.get(r.invigilator_user_id || "") || "—",
      ]);

    autoTable(doc, {
      startY: exportSection !== SECTION_ALL ? 32 : 27,
      head: [["Date", "Start", "Duration", "Subject", "Class/Section", "Room", "Max", "Pass", "Invigilator"]],
      body,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [33, 90, 165], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Generated ${format(new Date(), "PPp")}`, 14, finalY + 8);
    doc.save(`datesheet-${examName.replace(/\s+/g, "_")}${exportSection !== SECTION_ALL ? "-" + (secMap.get(exportSection) || "section").replace(/\s+/g, "_") : ""}.pdf`);
    toast.success("Datesheet exported");
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
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
              <Button size="sm" variant="outline" onClick={exportPdf}>
                <FileDown className="mr-1 h-4 w-4" />Export PDF
              </Button>
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
