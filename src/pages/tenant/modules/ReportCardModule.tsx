import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Printer, Search, User, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Exam { id: string; name: string; term_label: string | null; }
interface Student { id: string; first_name: string; last_name: string | null; student_code?: string | null; section_id?: string | null; }
interface Subject { id: string; name: string; }
interface Result { id?: string; subject_id: string; marks_obtained: number | null; max_marks: number; grade: string | null; remarks: string | null; }
interface Card { id?: string; total_marks: number | null; max_total: number | null; percentage: number | null; gpa: number | null; overall_grade: string | null; teacher_remarks: string | null; principal_remarks: string | null; attendance_percentage: number | null; is_published: boolean; }
interface ClassRow { id: string; name: string; }
interface SectionRow { id: string; name: string; class_id: string; }

interface Props { schoolId: string | null; canManage?: boolean; studentIdLocked?: string | null; }

const calcGrade = (pct: number) => {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A", gpa: 3.7 };
  if (pct >= 70) return { grade: "B", gpa: 3.0 };
  if (pct >= 60) return { grade: "C", gpa: 2.5 };
  if (pct >= 50) return { grade: "D", gpa: 2.0 };
  return { grade: "F", gpa: 0 };
};

export default function ReportCardModule({ schoolId, canManage = false, studentIdLocked }: Props) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [enrollments, setEnrollments] = useState<{ student_id: string; class_section_id: string }[]>([]);
  const [examId, setExamId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>(studentIdLocked || "");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [card, setCard] = useState<Card>({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false });
  const [school, setSchool] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // Picker UI state
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [ex, st, sub, sch, cls, sec, enr] = await Promise.all([
        (supabase as any).from("exams").select("id,name,term_label").eq("school_id", schoolId).order("start_date", { ascending: false }),
        (supabase as any).from("students").select("id,first_name,last_name,student_code").eq("school_id", schoolId).order("first_name"),
        (supabase as any).from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
        (supabase as any).from("schools").select("*").eq("id", schoolId).maybeSingle(),
        (supabase as any).from("academic_classes").select("id,name").eq("school_id", schoolId).order("name"),
        (supabase as any).from("class_sections").select("id,name,class_id").eq("school_id", schoolId),
        (supabase as any).from("student_enrollments").select("student_id,class_section_id").eq("school_id", schoolId),
      ]);
      setExams(ex.data || []); setStudents(st.data || []); setSubjects(sub.data || []); setSchool(sch.data);
      setClasses(cls.data || []); setSections(sec.data || []); setEnrollments(enr.data || []);
    })();
  }, [schoolId]);

  useEffect(() => { if (studentIdLocked) setStudentId(studentIdLocked); }, [studentIdLocked]);

  useEffect(() => {
    if (!studentId || !schoolId) return;
    (async () => {
      const [res, rc, info, assessments, marks] = await Promise.all([
        examId
          ? (supabase as any).from("exam_results").select("*").eq("school_id", schoolId).eq("exam_id", examId).eq("student_id", studentId)
          : Promise.resolve({ data: [] }),
        examId
          ? (supabase as any).from("report_cards").select("*").eq("school_id", schoolId).eq("exam_id", examId).eq("student_id", studentId).maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase as any).from("students").select("*").eq("id", studentId).maybeSingle(),
        (supabase as any).from("academic_assessments").select("id,subject_id,max_marks,is_published").eq("school_id", schoolId),
        (supabase as any).from("student_marks").select("assessment_id,marks,computed_grade").eq("school_id", schoolId).eq("student_id", studentId),
      ]);

      const map: Record<string, Result> = {};
      // 1) Prefer explicit exam_results
      (res.data || []).forEach((r: any) => { map[r.subject_id] = r; });

      // 2) Fallback / fill from published assessments + student_marks (aggregate per subject)
      const assessmentById = new Map<string, any>();
      (assessments.data || []).filter((a: any) => a.is_published !== false).forEach((a: any) => assessmentById.set(a.id, a));
      const perSubject: Record<string, { obtained: number; max: number }> = {};
      (marks.data || []).forEach((m: any) => {
        const a = assessmentById.get(m.assessment_id);
        if (!a || !a.subject_id || m.marks == null) return;
        const max = Number(a.max_marks || 100);
        if (!perSubject[a.subject_id]) perSubject[a.subject_id] = { obtained: 0, max: 0 };
        perSubject[a.subject_id].obtained += Number(m.marks);
        perSubject[a.subject_id].max += max;
      });
      Object.entries(perSubject).forEach(([subjectId, v]) => {
        if (map[subjectId]) return; // exam_results wins
        const pct = v.max > 0 ? (v.obtained / v.max) * 100 : 0;
        map[subjectId] = {
          subject_id: subjectId,
          marks_obtained: Math.round(v.obtained * 100) / 100,
          max_marks: v.max,
          grade: calcGrade(pct).grade,
          remarks: null,
        };
      });

      setResults(map);
      if (rc.data) setCard(rc.data);
      else setCard({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false });
      setStudentInfo(info.data);
    })();
  }, [examId, studentId, schoolId]);

  const updateMark = (subjectId: string, marks: number, max: number) => {
    setResults((prev) => ({ ...prev, [subjectId]: { ...(prev[subjectId] || {}), subject_id: subjectId, marks_obtained: marks, max_marks: max, grade: calcGrade((marks / max) * 100).grade, remarks: prev[subjectId]?.remarks || null } }));
  };

  const totals = useMemo(() => {
    let total = 0, max = 0;
    Object.values(results).forEach((r) => { if (r.marks_obtained != null) { total += Number(r.marks_obtained); max += Number(r.max_marks || 100); } });
    const pct = max > 0 ? (total / max) * 100 : 0;
    const g = calcGrade(pct);
    return { total, max, pct: Math.round(pct * 100) / 100, grade: g.grade, gpa: g.gpa };
  }, [results]);

  // Enriched students with section/class
  const enriched = useMemo(() => {
    return students.map((s) => {
      const enr = enrollments.find((e) => e.student_id === s.id);
      const sec = sections.find((x) => x.id === enr?.class_section_id);
      const cls = classes.find((c) => c.id === sec?.class_id);
      return { ...s, section_id: sec?.id ?? null, class_id: cls?.id ?? null, classLabel: cls ? `${cls.name}${sec ? ` • ${sec.name}` : ""}` : "Unassigned" };
    });
  }, [students, enrollments, sections, classes]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name || ""}`.toLowerCase();
      if (q && !fullName.includes(q) && !(s.student_code || "").toLowerCase().includes(q)) return false;
      if (classFilter !== "all" && s.class_id !== classFilter) return false;
      if (sectionFilter !== "all" && s.section_id !== sectionFilter) return false;
      return true;
    });
  }, [enriched, search, classFilter, sectionFilter]);

  const save = async (publish = false) => {
    if (!schoolId || !examId || !studentId) return toast.error("Select exam and student");
    for (const subjectId of Object.keys(results)) {
      const r = results[subjectId];
      if (r.marks_obtained == null) continue;
      await (supabase as any).from("exam_results").upsert({
        school_id: schoolId, exam_id: examId, student_id: studentId, subject_id: subjectId,
        marks_obtained: r.marks_obtained, max_marks: r.max_marks, grade: r.grade, remarks: r.remarks,
      }, { onConflict: "exam_id,student_id,subject_id" });
    }
    const payload = {
      school_id: schoolId, exam_id: examId, student_id: studentId,
      total_marks: totals.total, max_total: totals.max, percentage: totals.pct,
      gpa: totals.gpa, overall_grade: totals.grade,
      teacher_remarks: card.teacher_remarks, principal_remarks: card.principal_remarks,
      attendance_percentage: card.attendance_percentage,
      is_published: publish || card.is_published,
      published_at: publish ? new Date().toISOString() : null,
    };
    const { error } = await (supabase as any).from("report_cards").upsert(payload, { onConflict: "exam_id,student_id" });
    if (error) return toast.error(error.message);
    toast.success(publish ? "Published" : "Saved");
  };

  const showPicker = !studentIdLocked;
  const today = format(new Date(), "MMMM d, yyyy");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Report Cards</h2>
          <p className="text-sm text-muted-foreground">Premium printable result cards with school branding</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Print / Download PDF
        </Button>
      </div>

      <div className="grid gap-4 print:hidden lg:grid-cols-[320px_1fr]">
        {/* Left: Student picker */}
        {showPicker && (
          <div className="rounded-2xl border bg-card p-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter("all"); }}>
                  <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sections.filter((s) => classFilter === "all" || s.class_id === classFilter).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}{e.term_label ? ` (${e.term_label})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="mt-3 h-[460px] pr-2">
              <div className="space-y-1">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStudentId(s.id)}
                    className={`w-full rounded-xl border p-2 text-left transition-colors hover:bg-muted/50 ${studentId === s.id ? "border-primary bg-primary/5" : "border-transparent"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.first_name} {s.last_name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{s.classLabel}{s.student_code ? ` • ${s.student_code}` : ""}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">No students match your filters</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Right: Empty hint when nothing selected */}
        {(!studentId || !studentInfo) && (
          <div className="grid place-items-center rounded-2xl border bg-card p-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Select a student</p>
            <p className="text-sm text-muted-foreground">Pick a student on the left. Choose an exam for term cards, or leave blank for cumulative results.</p>
          </div>
        )}
      </div>

      {/* THE PRINTABLE REPORT CARD */}
      {studentId && studentInfo && (
        <div
          id="report-card-print"
          className="relative mx-auto rounded-2xl border-4 border-double border-primary/40 bg-white p-8 text-black shadow-2xl print:border-2 print:border-black print:shadow-none print:p-6"
          style={{ maxWidth: 820 }}
        >
          {/* Watermark */}
          {school?.logo_url && (
            <img
              src={school.logo_url}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.04]"
            />
          )}

          {/* Header */}
          <div className="relative flex items-center justify-between gap-4 border-b-2 border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              {school?.logo_url ? (
                <img src={school.logo_url} alt="School logo" className="h-20 w-20 rounded-lg object-contain ring-1 ring-gray-200" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
                  <FileText className="h-10 w-10 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-display text-3xl font-bold tracking-tight">{school?.name || "School"}</p>
                {school?.motto && <p className="text-xs italic text-gray-600">"{school.motto}"</p>}
                {school?.address && <p className="text-xs text-gray-600">{school.address}</p>}
                <p className="text-xs text-gray-600">
                  {[school?.phone, school?.email, school?.website].filter(Boolean).join(" • ")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Official Report Card
              </p>
              <p className="mt-2 text-sm font-semibold">{exams.find((e) => e.id === examId)?.name || "Cumulative Results"}</p>
              <p className="text-xs text-gray-600">Issued: {today}</p>
              {card.is_published && <p className="mt-1 text-[10px] font-bold text-green-700">PUBLISHED</p>}
            </div>
          </div>

          {/* Student info */}
          <div className="relative mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-gray-50 p-3 text-sm md:grid-cols-3">
            <p><span className="text-gray-500">Name:</span> <strong>{studentInfo.first_name} {studentInfo.last_name}</strong></p>
            <p><span className="text-gray-500">Roll No:</span> <strong>{studentInfo.student_code || "—"}</strong></p>
            <p><span className="text-gray-500">Class:</span> <strong>{studentInfo.class_sections?.academic_classes?.name || "—"}</strong></p>
            <p><span className="text-gray-500">Section:</span> <strong>{studentInfo.class_sections?.name || "—"}</strong></p>
            <p><span className="text-gray-500">DOB:</span> <strong>{studentInfo.date_of_birth ? format(new Date(studentInfo.date_of_birth), "MMM d, yyyy") : "—"}</strong></p>
            <p><span className="text-gray-500">Parent:</span> <strong>{studentInfo.parent_name || "—"}</strong></p>
            <p><span className="text-gray-500">Phone:</span> <strong>{studentInfo.phone || studentInfo.parent_phone || "—"}</strong></p>
            <p className="md:col-span-2"><span className="text-gray-500">Address:</span> <strong>{studentInfo.address || "—"}</strong></p>
          </div>

          {/* Subjects table */}
          <table className="relative mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary/10 text-left">
                <th className="border border-gray-300 p-2">Subject</th>
                <th className="border border-gray-300 p-2 text-center">Marks</th>
                <th className="border border-gray-300 p-2 text-center">Max</th>
                <th className="border border-gray-300 p-2 text-center">%</th>
                <th className="border border-gray-300 p-2 text-center">Grade</th>
                <th className="border border-gray-300 p-2 print:hidden">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const r = results[s.id];
                const max = r?.max_marks || 100;
                const obtained = r?.marks_obtained;
                const pct = obtained != null && max > 0 ? Math.round((Number(obtained) / Number(max)) * 100) : null;
                return (
                  <tr key={s.id}>
                    <td className="border border-gray-300 p-2">{s.name}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {canManage ? (
                        <Input type="number" className="h-8 w-20 text-black" value={r?.marks_obtained ?? ""} onChange={(e) => updateMark(s.id, Number(e.target.value), max)} />
                      ) : (obtained ?? "—")}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {canManage ? (
                        <Input type="number" className="h-8 w-20 text-black" value={r?.max_marks ?? 100} onChange={(e) => updateMark(s.id, Number(r?.marks_obtained || 0), Number(e.target.value))} />
                      ) : max}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{pct != null ? `${pct}%` : "—"}</td>
                    <td className="border border-gray-300 p-2 text-center font-semibold">{r?.grade ?? "—"}</td>
                    <td className="border border-gray-300 p-2 print:hidden">
                      {canManage ? (
                        <Input className="h-8 text-black" value={r?.remarks ?? ""} onChange={(e) => setResults({ ...results, [s.id]: { ...(results[s.id] || { subject_id: s.id, marks_obtained: null, max_marks: 100, grade: null, remarks: null }), remarks: e.target.value } })} />
                      ) : (r?.remarks || "—")}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-gray-300 p-2">TOTAL</td>
                <td className="border border-gray-300 p-2 text-center">{totals.total}</td>
                <td className="border border-gray-300 p-2 text-center">{totals.max}</td>
                <td className="border border-gray-300 p-2 text-center">{totals.pct}%</td>
                <td className="border border-gray-300 p-2 text-center">{totals.grade}</td>
                <td className="border border-gray-300 p-2 print:hidden"></td>
              </tr>
            </tbody>
          </table>

          {/* Summary */}
          <div className="relative mt-4 grid grid-cols-3 gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <div><p className="text-xs text-gray-600">Percentage</p><p className="font-display text-2xl font-bold">{totals.pct}%</p></div>
            <div><p className="text-xs text-gray-600">GPA</p><p className="font-display text-2xl font-bold">{totals.gpa}</p></div>
            <div><p className="text-xs text-gray-600">Overall Grade</p><p className="font-display text-2xl font-bold">{totals.grade}</p></div>
          </div>

          {/* Remarks */}
          <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Class Teacher Remarks</p>
              {canManage ? (
                <Textarea className="mt-1 text-black" rows={3} value={card.teacher_remarks || ""} onChange={(e) => setCard({ ...card, teacher_remarks: e.target.value })} />
              ) : <p className="mt-1 min-h-[60px] rounded border border-gray-200 p-2 text-sm">{card.teacher_remarks || "—"}</p>}
            </div>
            <div>
              <p className="text-sm font-semibold">Principal Remarks</p>
              {canManage ? (
                <Textarea className="mt-1 text-black" rows={3} value={card.principal_remarks || ""} onChange={(e) => setCard({ ...card, principal_remarks: e.target.value })} />
              ) : <p className="mt-1 min-h-[60px] rounded border border-gray-200 p-2 text-sm">{card.principal_remarks || "—"}</p>}
            </div>
          </div>

          <div className="relative mt-4 text-sm">
            <p>
              <strong>Attendance:</strong>{" "}
              {canManage ? (
                <Input type="number" className="inline-block h-8 w-24 text-black" value={card.attendance_percentage ?? ""} onChange={(e) => setCard({ ...card, attendance_percentage: Number(e.target.value) })} />
              ) : (card.attendance_percentage ?? "—")}%
            </p>
          </div>

          {/* Signatures */}
          <div className="relative mt-12 grid grid-cols-3 gap-4 text-center text-xs text-gray-600">
            <div><div className="border-t border-gray-500 px-4 pt-1">Class Teacher</div></div>
            <div><div className="border-t border-gray-500 px-4 pt-1">Principal</div></div>
            <div><div className="border-t border-gray-500 px-4 pt-1">Parent / Guardian</div></div>
          </div>

          <div className="relative mt-4 border-t border-dashed border-gray-300 pt-2 text-center text-[10px] text-gray-500">
            This is a computer-generated document by AltRix • {school?.name || "School"} • {today}
          </div>
        </div>
      )}

      {canManage && examId && studentId && (
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => save(false)}>Save Draft</Button>
          <Button onClick={() => save(true)}>Save & Publish</Button>
        </div>
      )}
    </div>
  );
}
