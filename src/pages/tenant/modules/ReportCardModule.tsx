import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Printer,
  Search,
  User,
  GraduationCap,
  ArrowLeft,
  Calendar,
  CalendarRange,
  ClipboardList,
  Sparkles,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Exam { id: string; name: string; term_label: string | null; start_date?: string | null; end_date?: string | null; }
interface Student { id: string; first_name: string; last_name: string | null; student_code?: string | null; section_id?: string | null; }
interface Subject { id: string; name: string; }
interface Result { id?: string; subject_id: string; marks_obtained: number | null; max_marks: number; grade: string | null; remarks: string | null; }
interface Card { id?: string; exam_id?: string | null; total_marks: number | null; max_total: number | null; percentage: number | null; gpa: number | null; overall_grade: string | null; teacher_remarks: string | null; principal_remarks: string | null; attendance_percentage: number | null; is_published: boolean; period_type?: string; period_label?: string | null; period_start?: string | null; period_end?: string | null; academic_year?: string | null; published_at?: string | null; }
interface ClassRow { id: string; name: string; }
interface SectionRow { id: string; name: string; class_id: string; }
interface AssessmentRow { id: string; title: string; subject_id: string | null; assessment_date: string | null; max_marks: number; is_published?: boolean | null; assessment_type?: string | null; weightage_percent?: number | null; }
interface MarkRow { assessment_id: string; marks: number | null; computed_grade: string | null; }
interface ReportCardRow {
  id: string;
  exam_id: string | null;
  student_id: string;
  period_type: string;
  period_label: string | null;
  percentage: number | null;
  overall_grade: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at: string | null;
}

type PeriodType = "exam" | "monthly" | "annual";

interface Props { schoolId: string | null; canManage?: boolean; studentIdLocked?: string | null; }

const calcGrade = (pct: number) => {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A", gpa: 3.7 };
  if (pct >= 70) return { grade: "B", gpa: 3.0 };
  if (pct >= 60) return { grade: "C", gpa: 2.5 };
  if (pct >= 50) return { grade: "D", gpa: 2.0 };
  return { grade: "F", gpa: 0 };
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const currentYear = () => new Date().getFullYear();
const academicYearLabel = () => {
  const y = currentYear();
  const m = new Date().getMonth();
  // School year roughly Aug-Jul; show "2025-2026" style.
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
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
  const [allAssessments, setAllAssessments] = useState<AssessmentRow[]>([]);
  const [allMarks, setAllMarks] = useState<MarkRow[]>([]);

  // Period mode
  const [periodType, setPeriodType] = useState<PeriodType>("exam");
  const [monthYear, setMonthYear] = useState<number>(currentYear());
  const [monthIdx, setMonthIdx] = useState<number>(new Date().getMonth());
  const [annualYear, setAnnualYear] = useState<string>(academicYearLabel());

  // Picker UI state
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  // List view (parent/student)
  const [myCards, setMyCards] = useState<ReportCardRow[]>([]);
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);
  const isReadOnlyForChild = !!studentIdLocked && !canManage;

  // Load directory
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [ex, st, sub, sch, cls, sec, enr] = await Promise.all([
        (supabase as any).from("exams").select("id,name,term_label,start_date,end_date").eq("school_id", schoolId).order("start_date", { ascending: false }),
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

  // Load list of published cards for parent/student
  useEffect(() => {
    if (!isReadOnlyForChild || !schoolId || !studentId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("report_cards")
        .select("id,exam_id,student_id,period_type,period_label,percentage,overall_grade,is_published,published_at,updated_at")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false });
      setMyCards(data || []);
    })();
  }, [isReadOnlyForChild, schoolId, studentId]);

  // Build current period_label
  const currentPeriodLabel = useMemo(() => {
    if (periodType === "monthly") return `${MONTHS[monthIdx]} ${monthYear}`;
    if (periodType === "annual") return `Annual ${annualYear}`;
    return null;
  }, [periodType, monthIdx, monthYear, annualYear]);

  const currentPeriodRange = useMemo(() => {
    if (periodType === "monthly") {
      const start = new Date(monthYear, monthIdx, 1);
      const end = new Date(monthYear, monthIdx + 1, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }
    if (periodType === "annual") {
      const [y1, y2] = annualYear.split("-").map((s) => parseInt(s, 10));
      if (!y1 || !y2) return { start: null, end: null };
      return { start: `${y1}-08-01`, end: `${y2}-07-31` };
    }
    return { start: null, end: null };
  }, [periodType, monthIdx, monthYear, annualYear]);

  // Load card + results for chosen context
  useEffect(() => {
    if (!studentId || !schoolId) return;
    if (isReadOnlyForChild && !viewingCardId) return; // wait until parent opens a specific card
    (async () => {
      let rcQuery = (supabase as any).from("report_cards").select("*").eq("school_id", schoolId).eq("student_id", studentId);
      if (viewingCardId) {
        rcQuery = rcQuery.eq("id", viewingCardId).maybeSingle();
      } else if (periodType === "exam") {
        if (!examId) {
          rcQuery = Promise.resolve({ data: null });
        } else {
          rcQuery = rcQuery.eq("exam_id", examId).maybeSingle();
        }
      } else {
        rcQuery = rcQuery.is("exam_id", null).eq("period_type", periodType).eq("period_label", currentPeriodLabel).maybeSingle();
      }

      const examIdForResults = viewingCardId ? null : (periodType === "exam" ? examId : null);

      const [res, rc, info, assessments, marks] = await Promise.all([
        examIdForResults
          ? (supabase as any).from("exam_results").select("*").eq("school_id", schoolId).eq("exam_id", examIdForResults).eq("student_id", studentId)
          : Promise.resolve({ data: [] }),
        rcQuery,
        (supabase as any).from("students").select("*").eq("id", studentId).maybeSingle(),
        (supabase as any).from("academic_assessments").select("id,subject_id,max_marks,is_published,title,assessment_date,assessment_type,weightage_percent").eq("school_id", schoolId),
        (supabase as any).from("student_marks").select("assessment_id,marks,computed_grade").eq("school_id", schoolId).eq("student_id", studentId),
      ]);

      const loadedCard: any = (rc as any).data || null;
      setAllAssessments(assessments.data || []);
      setAllMarks(marks.data || []);

      // If viewing existing saved card and it has exam_id, load its exam_results too
      let savedResults: any[] = res.data || [];
      if (loadedCard?.exam_id && (!savedResults || savedResults.length === 0)) {
        const { data } = await (supabase as any)
          .from("exam_results").select("*")
          .eq("school_id", schoolId).eq("exam_id", loadedCard.exam_id).eq("student_id", studentId);
        savedResults = data || [];
      }

      const map: Record<string, Result> = {};
      savedResults.forEach((r: any) => { map[r.subject_id] = r; });

      // Determine which assessments are in scope for the period
      const inScope = (assessments.data || []).filter((a: any) => {
        if (a.is_published === false) return false;
        if (loadedCard?.exam_id || examIdForResults) return true; // exam mode: include all (existing fallback behavior)
        if (periodType === "monthly") {
          const d = a.assessment_date ? new Date(a.assessment_date) : null;
          if (!d) return false;
          return d.getFullYear() === monthYear && d.getMonth() === monthIdx;
        }
        if (periodType === "annual") {
          const d = a.assessment_date ? new Date(a.assessment_date) : null;
          if (!d || !currentPeriodRange.start || !currentPeriodRange.end) return false;
          return d >= new Date(currentPeriodRange.start) && d <= new Date(currentPeriodRange.end);
        }
        if (loadedCard?.period_type === "monthly" && loadedCard.period_start && loadedCard.period_end) {
          const d = a.assessment_date ? new Date(a.assessment_date) : null;
          return !!d && d >= new Date(loadedCard.period_start) && d <= new Date(loadedCard.period_end);
        }
        if (loadedCard?.period_type === "annual" && loadedCard.period_start && loadedCard.period_end) {
          const d = a.assessment_date ? new Date(a.assessment_date) : null;
          return !!d && d >= new Date(loadedCard.period_start) && d <= new Date(loadedCard.period_end);
        }
        return true;
      });
      const inScopeIds = new Set(inScope.map((a: any) => a.id));
      const assessmentById = new Map<string, any>(inScope.map((a: any) => [a.id, a]));

      const perSubject: Record<string, { obtained: number; max: number }> = {};
      (marks.data || []).forEach((m: any) => {
        if (!inScopeIds.has(m.assessment_id)) return;
        const a = assessmentById.get(m.assessment_id);
        if (!a || !a.subject_id || m.marks == null) return;
        const max = Number(a.max_marks || 100);
        if (!perSubject[a.subject_id]) perSubject[a.subject_id] = { obtained: 0, max: 0 };
        perSubject[a.subject_id].obtained += Number(m.marks);
        perSubject[a.subject_id].max += max;
      });
      Object.entries(perSubject).forEach(([subjectId, v]) => {
        if (map[subjectId]) return;
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
      if (loadedCard) setCard(loadedCard);
      else setCard({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false });
      setStudentInfo(info.data);

      // If we opened a saved card, sync the period selector for display
      if (loadedCard) {
        if (loadedCard.exam_id) { setPeriodType("exam"); setExamId(loadedCard.exam_id); }
        else if (loadedCard.period_type === "monthly" || loadedCard.period_type === "annual") {
          setPeriodType(loadedCard.period_type);
        }
      }
    })();
  }, [examId, studentId, schoolId, periodType, currentPeriodLabel, viewingCardId, isReadOnlyForChild, monthIdx, monthYear, currentPeriodRange.start, currentPeriodRange.end]);

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

  // Per-assessment appendix for the loaded card
  const appendix = useMemo(() => {
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    let scope = allAssessments.filter((a) => a.is_published !== false);
    if (card.exam_id || (periodType === "exam" && examId)) {
      // exam mode — show all marks for this student (existing behavior)
    } else if (card.period_type === "monthly" && card.period_start && card.period_end) {
      const s = new Date(card.period_start), e = new Date(card.period_end);
      scope = scope.filter((a) => a.assessment_date && new Date(a.assessment_date) >= s && new Date(a.assessment_date) <= e);
    } else if (card.period_type === "annual" && card.period_start && card.period_end) {
      const s = new Date(card.period_start), e = new Date(card.period_end);
      scope = scope.filter((a) => a.assessment_date && new Date(a.assessment_date) >= s && new Date(a.assessment_date) <= e);
    } else if (periodType === "monthly") {
      scope = scope.filter((a) => {
        if (!a.assessment_date) return false;
        const d = new Date(a.assessment_date);
        return d.getFullYear() === monthYear && d.getMonth() === monthIdx;
      });
    } else if (periodType === "annual" && currentPeriodRange.start && currentPeriodRange.end) {
      const s = new Date(currentPeriodRange.start), e = new Date(currentPeriodRange.end);
      scope = scope.filter((a) => a.assessment_date && new Date(a.assessment_date) >= s && new Date(a.assessment_date) <= e);
    }
    const markByA = new Map(allMarks.map((m) => [m.assessment_id, m]));
    return scope
      .map((a) => ({
        id: a.id,
        title: a.title,
        subject: a.subject_id ? subjectName.get(a.subject_id) ?? "—" : "—",
        date: a.assessment_date,
        max: a.max_marks,
        marks: markByA.get(a.id)?.marks ?? null,
        grade: markByA.get(a.id)?.computed_grade ?? null,
      }))
      .sort((x, y) => (x.date || "").localeCompare(y.date || ""));
  }, [allAssessments, allMarks, subjects, card, periodType, examId, monthIdx, monthYear, currentPeriodRange.start, currentPeriodRange.end]);

  // ───── Per-subject × per-category breakdown (quiz/test/assignment/project/exam/etc.)
  const CATEGORY_ORDER: { key: string; label: string }[] = [
    { key: "quiz", label: "Quizzes" },
    { key: "test", label: "Tests" },
    { key: "assignment", label: "Assignments" },
    { key: "project", label: "Projects" },
    { key: "classwork", label: "Classwork" },
    { key: "homework", label: "Homework" },
    { key: "practical", label: "Practical" },
    { key: "oral", label: "Oral" },
    { key: "presentation", label: "Presentation" },
    { key: "lab", label: "Lab" },
    { key: "midterm", label: "Mid-term" },
    { key: "exam", label: "Exam" },
    { key: "final", label: "Final" },
  ];

  const categoryBreakdown = useMemo(() => {
    // Filter assessments by current period scope
    const inScope = appendix.map((a) => a.id);
    const inScopeSet = new Set(inScope);
    const markByA = new Map(allMarks.map((m) => [m.assessment_id, m]));

    // matrix: subjectId -> categoryKey -> { obtained, max }
    const matrix: Record<string, Record<string, { obtained: number; max: number }>> = {};
    const usedCategories = new Set<string>();

    allAssessments.forEach((a) => {
      if (!inScopeSet.has(a.id)) return;
      if (!a.subject_id) return;
      const cat = (a.assessment_type || "test").toLowerCase();
      const m = markByA.get(a.id);
      if (m?.marks == null) return;
      usedCategories.add(cat);
      const max = Number(a.max_marks || 100);
      if (!matrix[a.subject_id]) matrix[a.subject_id] = {};
      if (!matrix[a.subject_id][cat]) matrix[a.subject_id][cat] = { obtained: 0, max: 0 };
      matrix[a.subject_id][cat].obtained += Number(m.marks);
      matrix[a.subject_id][cat].max += max;
    });

    const visibleCategories = CATEGORY_ORDER.filter((c) => usedCategories.has(c.key));
    return { matrix, visibleCategories };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAssessments, allMarks, appendix]);

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

  const periodTitle = useMemo(() => {
    if (card.exam_id) return exams.find((e) => e.id === card.exam_id)?.name || "Exam Report";
    if (card.period_label) return card.period_label;
    if (periodType === "exam") return exams.find((e) => e.id === examId)?.name || "Cumulative Results";
    return currentPeriodLabel || "Report Card";
  }, [card, exams, examId, periodType, currentPeriodLabel]);

  const save = async (publish = false) => {
    if (!schoolId || !studentId) return toast.error("Select a student");
    if (periodType === "exam" && !examId) return toast.error("Select an exam");
    const userResp = await (supabase as any).auth.getUser();
    const uid = userResp.data?.user?.id ?? null;

    // Save subject-level marks only for exam mode (where exam_results table is keyed by exam_id)
    if (periodType === "exam") {
      for (const subjectId of Object.keys(results)) {
        const r = results[subjectId];
        if (r.marks_obtained == null) continue;
        await (supabase as any).from("exam_results").upsert({
          school_id: schoolId, exam_id: examId, student_id: studentId, subject_id: subjectId,
          marks_obtained: r.marks_obtained, max_marks: r.max_marks, grade: r.grade, remarks: r.remarks,
        }, { onConflict: "exam_id,student_id,subject_id" });
      }
    }

    const basePayload: any = {
      school_id: schoolId, student_id: studentId,
      total_marks: totals.total, max_total: totals.max, percentage: totals.pct,
      gpa: totals.gpa, overall_grade: totals.grade,
      teacher_remarks: card.teacher_remarks, principal_remarks: card.principal_remarks,
      attendance_percentage: card.attendance_percentage,
      is_published: publish || card.is_published,
      published_at: publish ? new Date().toISOString() : (card as any).published_at ?? null,
      last_edited_by: uid,
      period_type: periodType,
    };

    let onConflict: string;
    if (periodType === "exam") {
      basePayload.exam_id = examId;
      basePayload.period_label = exams.find((e) => e.id === examId)?.name ?? null;
      onConflict = "exam_id,student_id";
    } else {
      basePayload.exam_id = null;
      basePayload.period_label = currentPeriodLabel;
      basePayload.period_start = currentPeriodRange.start;
      basePayload.period_end = currentPeriodRange.end;
      basePayload.academic_year = periodType === "annual" ? annualYear : null;
      onConflict = "school_id,student_id,period_type,period_label";
    }

    const { error } = await (supabase as any).from("report_cards").upsert(basePayload, { onConflict });
    if (error) return toast.error(error.message);
    toast.success(publish ? "Published — visible to student & parents" : "Saved as draft");
  };

  const showPicker = !studentIdLocked;
  const today = format(new Date(), "MMMM d, yyyy");

  // ───────────── Parent / Student LIST view ─────────────
  if (isReadOnlyForChild && !viewingCardId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Report Cards</h2>
          <p className="text-sm text-muted-foreground">All published monthly, exam and annual report cards</p>
        </div>

        {myCards.length === 0 ? (
          <Card>
            <CardContent className="grid place-items-center py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No report cards yet</p>
              <p className="text-sm text-muted-foreground">Cards will appear here as soon as they are published.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCards.map((c) => {
              const ex = c.exam_id ? exams.find((e) => e.id === c.exam_id) : null;
              const title = ex?.name || c.period_label || "Report Card";
              const Icon = c.period_type === "annual" ? Sparkles : c.period_type === "monthly" ? Calendar : c.period_type === "exam" ? FileText : ClipboardList;
              return (
                <button
                  key={c.id}
                  onClick={() => setViewingCardId(c.id)}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.period_type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">{c.overall_grade || "—"}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Percentage</p>
                      <p className="font-display text-2xl font-bold">{c.percentage != null ? `${Number(c.percentage).toFixed(1)}%` : "—"}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {c.published_at ? format(new Date(c.published_at), "MMM d, yyyy") : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {isReadOnlyForChild && viewingCardId && (
            <Button variant="ghost" size="sm" onClick={() => { setViewingCardId(null); setCard({ total_marks: 0, max_total: 0, percentage: 0, gpa: 0, overall_grade: "", teacher_remarks: "", principal_remarks: "", attendance_percentage: null, is_published: false }); }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> All cards
            </Button>
          )}
          <div>
            <h2 className="font-display text-2xl font-semibold">Report Cards</h2>
            <p className="text-sm text-muted-foreground">Monthly, exam-based and annual cumulative reports</p>
          </div>
        </div>
        <Button variant="outline" onClick={async () => {
          const el = document.getElementById("report-card-print") as HTMLElement | null;
          if (!el) return toast.error("No report card to export");
          try {
            el.classList.add("exporting-pdf");
            const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: el.scrollWidth });
            el.classList.remove("exporting-pdf");
            const pdf = new jsPDF("p", "mm", "a4");
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 8;
            const availW = pageW - margin * 2;
            const availH = pageH - margin * 2;
            const ratio = canvas.width / canvas.height;
            let w = availW; let h = w / ratio;
            if (h > availH) { h = availH; w = h * ratio; }
            const x = (pageW - w) / 2; const y = (pageH - h) / 2;
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h, undefined, "FAST");
            const name = (studentInfo ? `${studentInfo.first_name}-${studentInfo.last_name || ""}` : "report-card").replace(/\s+/g, "_");
            pdf.save(`${name}_report-card.pdf`);
          } catch (e: any) {
            el.classList.remove("exporting-pdf");
            toast.error(e?.message || "Failed to export PDF");
          }
        }}>
          <Printer className="mr-2 h-4 w-4" />Download PDF
        </Button>
      </div>

      {/* Period selector — staff or "create" mode */}
      {!isReadOnlyForChild && (
        <div className="rounded-2xl border bg-card p-3 print:hidden">
          <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <TabsList>
              <TabsTrigger value="exam"><FileText className="mr-1 h-4 w-4" />Exam</TabsTrigger>
              <TabsTrigger value="monthly"><Calendar className="mr-1 h-4 w-4" />Monthly</TabsTrigger>
              <TabsTrigger value="annual"><CalendarRange className="mr-1 h-4 w-4" />Annual</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {periodType === "exam" && (
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}{e.term_label ? ` (${e.term_label})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {periodType === "monthly" && (
              <>
                <Select value={String(monthIdx)} onValueChange={(v) => setMonthIdx(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(monthYear)} onValueChange={(v) => setMonthYear(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }, (_, i) => currentYear() - 3 + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {periodType === "annual" && (
              <Select value={annualYear} onValueChange={setAnnualYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => currentYear() - 3 + i).map((y) => (
                    <SelectItem key={`${y}-${y + 1}`} value={`${y}-${y + 1}`}>{`${y}-${y + 1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 print:hidden lg:grid-cols-[320px_1fr]">
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

        {(!studentId || !studentInfo) && (
          <div className="grid place-items-center rounded-2xl border bg-card p-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Select a student</p>
            <p className="text-sm text-muted-foreground">Pick a student, then choose Exam, Monthly, or Annual to build the report.</p>
          </div>
        )}
      </div>

      {studentId && studentInfo && (
        <div
          id="report-card-print"
          className="relative mx-auto overflow-hidden rounded-3xl bg-white text-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 print:rounded-none print:shadow-none print:ring-0"
          style={{ maxWidth: 860 }}
        >
          {/* Decorative top band */}
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.55) 0, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.35) 0, transparent 45%)" }} />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex h-full items-center justify-between px-8">
              <div className="flex items-center gap-4">
                {school?.logo_url ? (
                  <img src={school.logo_url} alt="School logo" className="h-16 w-16 rounded-xl bg-white/95 object-contain p-1.5 shadow-lg" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/95 shadow-lg">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-display text-2xl font-bold leading-tight tracking-tight">{school?.name || "School"}</p>
                  {school?.motto && <p className="text-[11px] italic opacity-90">"{school.motto}"</p>}
                  <p className="text-[11px] opacity-90">{[school?.address, school?.phone, school?.email].filter(Boolean).join(" • ")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur">
                  {(card.period_type || periodType) === "annual" ? "Annual Report" : (card.period_type || periodType) === "monthly" ? "Monthly Report" : "Official Report"}
                </p>
                {card.is_published && <p className="mt-2 text-[10px] font-bold text-emerald-200">● PUBLISHED</p>}
              </div>
            </div>
          </div>

          {/* Watermark */}
          {school?.logo_url && (
            <img src={school.logo_url} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.035]" />
          )}

          <div className="relative px-8 pb-8 pt-6">
            {/* Title + meta */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-dashed border-gray-300 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Academic Report Card</p>
                <p className="font-display text-2xl font-bold tracking-tight">{periodTitle}</p>
              </div>
              <p className="text-xs text-gray-500">Issued <strong className="text-gray-700">{today}</strong></p>
            </div>

            {/* Student profile card */}
            <div className="relative mb-5 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 md:grid-cols-[auto_1fr]">
              {studentInfo.profile_image_url ? (
                <img src={studentInfo.profile_image_url} alt="" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-3">
                <p><span className="text-gray-500">Name:</span> <strong>{studentInfo.first_name} {studentInfo.last_name}</strong></p>
                <p><span className="text-gray-500">Roll No:</span> <strong>{studentInfo.student_code || "—"}</strong></p>
                <p><span className="text-gray-500">Class:</span> <strong>{(() => { const e = enrollments.find(x => x.student_id === studentId); const sec = sections.find(s => s.id === e?.class_section_id); const cls = classes.find(c => c.id === sec?.class_id); return cls?.name || "—"; })()}</strong></p>
                <p><span className="text-gray-500">Section:</span> <strong>{(() => { const e = enrollments.find(x => x.student_id === studentId); const sec = sections.find(s => s.id === e?.class_section_id); return sec?.name || "—"; })()}</strong></p>
                <p><span className="text-gray-500">DOB:</span> <strong>{studentInfo.date_of_birth ? format(new Date(studentInfo.date_of_birth), "MMM d, yyyy") : "—"}</strong></p>
                <p><span className="text-gray-500">Parent:</span> <strong>{studentInfo.parent_name || "—"}</strong></p>
                <p><span className="text-gray-500">Phone:</span> <strong>{studentInfo.phone || studentInfo.parent_phone || "—"}</strong></p>
                <p className="md:col-span-2"><span className="text-gray-500">Address:</span> <strong>{studentInfo.address || "—"}</strong></p>
              </div>
            </div>

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

          {/* Premium summary tiles */}
          <div className="relative mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 ring-1 ring-primary/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Percentage</p>
              <p className="font-display text-3xl font-bold text-primary">{totals.pct}%</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">GPA</p>
              <p className="font-display text-3xl font-bold text-amber-700">{totals.gpa}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-4 ring-1 ring-emerald-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Overall Grade</p>
              <p className="font-display text-3xl font-bold text-emerald-700">{totals.grade}</p>
            </div>
          </div>

          {/* Category breakdown — Quizzes / Tests / Assignments / Projects / Exam etc. */}
          {categoryBreakdown.visibleCategories.length > 0 && (
            <div className="relative mt-6">
              <p className="mb-2 text-sm font-semibold">Continuous Assessment Breakdown</p>
              <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/10 to-primary/5 text-left">
                      <th className="p-2 font-semibold">Subject</th>
                      {categoryBreakdown.visibleCategories.map((c) => (
                        <th key={c.key} className="p-2 text-center font-semibold">{c.label}</th>
                      ))}
                      <th className="p-2 text-center font-semibold">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => {
                      const row = categoryBreakdown.matrix[s.id];
                      if (!row) return null;
                      let tObt = 0, tMax = 0;
                      Object.values(row).forEach((v) => { tObt += v.obtained; tMax += v.max; });
                      if (tMax === 0) return null;
                      return (
                        <tr key={s.id} className="border-t border-gray-200">
                          <td className="p-2 font-medium">{s.name}</td>
                          {categoryBreakdown.visibleCategories.map((c) => {
                            const v = row[c.key];
                            return (
                              <td key={c.key} className="p-2 text-center text-gray-700">
                                {v ? <span><strong>{v.obtained}</strong><span className="text-gray-400">/{v.max}</span></span> : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-semibold text-primary">
                            {tObt}/{tMax}<span className="ml-1 text-[10px] text-gray-500">({tMax ? Math.round((tObt/tMax)*100) : 0}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Includes all published quizzes, tests, assignments, projects and exam-style assessments in this period.</p>
            </div>
          )}


          {/* Per-assessment appendix */}
          {appendix.length > 0 && (
            <div className="relative mt-5">
              <p className="mb-1 text-sm font-semibold">Assessments, Assignments &amp; Tasks</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border border-gray-300 p-1.5">Title</th>
                    <th className="border border-gray-300 p-1.5">Subject</th>
                    <th className="border border-gray-300 p-1.5">Date</th>
                    <th className="border border-gray-300 p-1.5 text-center">Marks</th>
                    <th className="border border-gray-300 p-1.5 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {appendix.map((a) => (
                    <tr key={a.id}>
                      <td className="border border-gray-300 p-1.5">{a.title}</td>
                      <td className="border border-gray-300 p-1.5">{a.subject}</td>
                      <td className="border border-gray-300 p-1.5">{a.date ? format(new Date(a.date), "MMM d, yyyy") : "—"}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{a.marks != null ? `${a.marks} / ${a.max}` : "—"}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{a.grade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

          <div className="relative mt-12 grid grid-cols-3 gap-4 text-center text-xs text-gray-600">
            <div><div className="border-t border-gray-500 px-4 pt-1">Class Teacher</div></div>
            <div><div className="border-t border-gray-500 px-4 pt-1">Principal</div></div>
            <div><div className="border-t border-gray-500 px-4 pt-1">Parent / Guardian</div></div>
          </div>

          <div className="relative mt-4 border-t border-dashed border-gray-300 pt-2 text-center text-[10px] text-gray-500">
            This is a computer-generated document by AltRix • {school?.name || "School"} • {today}
          </div>
          </div>
        </div>
      )}

      {canManage && studentId && (
        <div className="sticky bottom-2 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur print:hidden">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {periodType === "exam"
                ? (examId ? "Ready to save exam report card" : "Pick an exam to enable saving")
                : `Ready to save ${periodType} report card — ${currentPeriodLabel}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Drafts are private. Publishing makes the card visible to the student & parents.
            </p>
          </div>
          <Button variant="outline" disabled={periodType === "exam" && !examId} onClick={() => save(false)}>
            Save Draft
          </Button>
          <Button disabled={periodType === "exam" && !examId} onClick={() => save(true)}>
            Save &amp; Publish
          </Button>
        </div>
      )}
    </div>
  );
}
