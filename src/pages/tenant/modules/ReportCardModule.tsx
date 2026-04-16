import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface Exam { id: string; name: string; term_label: string | null; }
interface Student { id: string; first_name: string; last_name: string; student_code?: string; }
interface Subject { id: string; name: string; }
interface Result { id?: string; subject_id: string; marks_obtained: number | null; max_marks: number; grade: string | null; remarks: string | null; }
interface Card { id?: string; total_marks: number | null; max_total: number | null; percentage: number | null; gpa: number | null; overall_grade: string | null; teacher_remarks: string | null; principal_remarks: string | null; attendance_percentage: number | null; is_published: boolean; }

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
  const [examId, setExamId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>(studentIdLocked || "");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [card, setCard] = useState<Card>({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false });
  const [school, setSchool] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [ex, st, sub, sch] = await Promise.all([
        (supabase as any).from("exams").select("id,name,term_label").eq("school_id", schoolId).order("start_date", { ascending: false }),
        (supabase as any).from("students").select("id,first_name,last_name,student_code").eq("school_id", schoolId).order("first_name"),
        (supabase as any).from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
        (supabase as any).from("schools").select("*").eq("id", schoolId).maybeSingle(),
      ]);
      setExams(ex.data || []); setStudents(st.data || []); setSubjects(sub.data || []); setSchool(sch.data);
    })();
  }, [schoolId]);

  useEffect(() => { if (studentIdLocked) setStudentId(studentIdLocked); }, [studentIdLocked]);

  useEffect(() => {
    if (!examId || !studentId || !schoolId) return;
    (async () => {
      const [res, rc, info] = await Promise.all([
        (supabase as any).from("exam_results").select("*").eq("school_id", schoolId).eq("exam_id", examId).eq("student_id", studentId),
        (supabase as any).from("report_cards").select("*").eq("school_id", schoolId).eq("exam_id", examId).eq("student_id", studentId).maybeSingle(),
        (supabase as any).from("students").select("*, class_sections(name, academic_classes(name))").eq("id", studentId).maybeSingle(),
      ]);
      const map: Record<string, Result> = {};
      (res.data || []).forEach((r: any) => { map[r.subject_id] = r; });
      setResults(map);
      if (rc.data) setCard(rc.data);
      else setCard({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false });
      setStudentInfo(info.data);
    })();
  }, [examId, studentId, schoolId]);

  const updateMark = (subjectId: string, marks: number, max: number) => {
    setResults((prev) => ({ ...prev, [subjectId]: { ...(prev[subjectId] || {}), subject_id: subjectId, marks_obtained: marks, max_marks: max, grade: calcGrade((marks / max) * 100).grade, remarks: prev[subjectId]?.remarks || null } }));
  };

  const totals = (() => {
    let total = 0, max = 0;
    Object.values(results).forEach((r) => { if (r.marks_obtained != null) { total += Number(r.marks_obtained); max += Number(r.max_marks || 100); } });
    const pct = max > 0 ? (total / max) * 100 : 0;
    const g = calcGrade(pct);
    return { total, max, pct: Math.round(pct * 100) / 100, grade: g.grade, gpa: g.gpa };
  })();

  const save = async (publish = false) => {
    if (!schoolId || !examId || !studentId) return toast.error("Select exam and student");
    // upsert results
    for (const subjectId of Object.keys(results)) {
      const r = results[subjectId];
      if (r.marks_obtained == null) continue;
      await (supabase as any).from("exam_results").upsert({
        school_id: schoolId, exam_id: examId, student_id: studentId, subject_id: subjectId,
        marks_obtained: r.marks_obtained, max_marks: r.max_marks, grade: r.grade, remarks: r.remarks,
      }, { onConflict: "exam_id,student_id,subject_id" });
    }
    // upsert card
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div><h2 className="font-display text-2xl font-semibold">Report Cards</h2>
        <p className="text-sm text-muted-foreground">Generate, view & download student result cards</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 print:hidden">
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}{e.term_label ? ` (${e.term_label})` : ""}</SelectItem>)}</SelectContent>
        </Select>
        {!studentIdLocked && (
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {examId && studentId && studentInfo && (
        <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:shadow-none print:p-4" id="report-card-print">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              {school?.logo_url ? <img src={school.logo_url} alt="logo" className="h-16 w-16 object-contain" /> :
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gray-100"><FileText className="h-8 w-8" /></div>}
              <div>
                <p className="text-2xl font-bold">{school?.name || "School"}</p>
                <p className="text-sm text-gray-600">{school?.address || ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">REPORT CARD</p>
              <p className="text-sm">{exams.find((e) => e.id === examId)?.name}</p>
            </div>
          </div>

          {/* Student info */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <p><strong>Name:</strong> {studentInfo.first_name} {studentInfo.last_name}</p>
            <p><strong>Roll No:</strong> {studentInfo.student_code || "—"}</p>
            <p><strong>Class:</strong> {studentInfo.class_sections?.academic_classes?.name || "—"}</p>
            <p><strong>Section:</strong> {studentInfo.class_sections?.name || "—"}</p>
          </div>

          {/* Subjects table */}
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Subject</th>
                <th className="border border-gray-300 p-2 text-center">Marks</th>
                <th className="border border-gray-300 p-2 text-center">Max</th>
                <th className="border border-gray-300 p-2 text-center">Grade</th>
                <th className="border border-gray-300 p-2 text-left print:hidden">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const r = results[s.id];
                return (
                  <tr key={s.id}>
                    <td className="border border-gray-300 p-2">{s.name}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {canManage ? (
                        <Input type="number" className="h-8 w-20 text-black" value={r?.marks_obtained ?? ""} onChange={(e) => updateMark(s.id, Number(e.target.value), r?.max_marks || 100)} />
                      ) : (r?.marks_obtained ?? "—")}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {canManage ? (
                        <Input type="number" className="h-8 w-20 text-black" value={r?.max_marks ?? 100} onChange={(e) => updateMark(s.id, r?.marks_obtained || 0, Number(e.target.value))} />
                      ) : (r?.max_marks ?? 100)}
                    </td>
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
                <td className="border border-gray-300 p-2 text-center">{totals.grade}</td>
                <td className="border border-gray-300 p-2 print:hidden"></td>
              </tr>
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
            <div><p className="text-gray-600">Percentage</p><p className="text-2xl font-bold">{totals.pct}%</p></div>
            <div><p className="text-gray-600">GPA</p><p className="text-2xl font-bold">{totals.gpa}</p></div>
            <div><p className="text-gray-600">Overall Grade</p><p className="text-2xl font-bold">{totals.grade}</p></div>
          </div>

          {/* Remarks */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Teacher Remarks</p>
              {canManage ? (
                <Textarea className="mt-1 text-black" rows={3} value={card.teacher_remarks || ""} onChange={(e) => setCard({ ...card, teacher_remarks: e.target.value })} />
              ) : <p className="mt-1 rounded border border-gray-200 p-2 text-sm">{card.teacher_remarks || "—"}</p>}
            </div>
            <div>
              <p className="text-sm font-semibold">Principal Remarks</p>
              {canManage ? (
                <Textarea className="mt-1 text-black" rows={3} value={card.principal_remarks || ""} onChange={(e) => setCard({ ...card, principal_remarks: e.target.value })} />
              ) : <p className="mt-1 rounded border border-gray-200 p-2 text-sm">{card.principal_remarks || "—"}</p>}
            </div>
          </div>

          <div className="mt-4 text-sm">
            <p><strong>Attendance:</strong> {canManage ? (
              <Input type="number" className="inline-block h-8 w-24 text-black" value={card.attendance_percentage ?? ""} onChange={(e) => setCard({ ...card, attendance_percentage: Number(e.target.value) })} />
            ) : (card.attendance_percentage ?? "—")}%</p>
          </div>

          <div className="mt-8 flex items-end justify-between text-xs text-gray-600">
            <div><div className="border-t border-gray-400 px-12 pt-1">Class Teacher</div></div>
            <div><div className="border-t border-gray-400 px-12 pt-1">Principal</div></div>
            <div><div className="border-t border-gray-400 px-12 pt-1">Parent</div></div>
          </div>
        </div>
      )}

      {canManage && examId && studentId && (
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => save(false)}>Save Draft</Button>
          <Button variant="default" onClick={() => save(true)}><Download className="mr-2 h-4 w-4" />Save & Publish</Button>
        </div>
      )}
    </div>
  );
}
