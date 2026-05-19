import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Globe, Users, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  examId: string;
  examName: string;
  resultPublished: boolean;
  resultPublishedAt: string | null;
  onUpdated: () => void;
}

interface Pub {
  id: string;
  scope: string;
  class_section_id: string | null;
  student_id: string | null;
  is_published: boolean;
  publish_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function ExamPublishDialog({
  open, onOpenChange, schoolId, examId, examName, resultPublished, resultPublishedAt, onUpdated,
}: Props) {
  const { user } = useSession();
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_name?: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; first_name: string; last_name: string; class_section_id?: string | null }[]>([]);

  // exam-wide
  const [examPublishAt, setExamPublishAt] = useState<string>("");
  const [examNotes, setExamNotes] = useState<string>("");

  // section
  const [secId, setSecId] = useState<string>("");
  const [secAt, setSecAt] = useState<string>("");
  const [secNotes, setSecNotes] = useState<string>("");
  const [secPublished, setSecPublished] = useState(true);

  // student
  const [studClassId, setStudClassId] = useState<string>("");
  const [studId, setStudId] = useState<string>("");
  const [studAt, setStudAt] = useState<string>("");
  const [studNotes, setStudNotes] = useState<string>("");
  const [studPublished, setStudPublished] = useState(true);

  const load = async () => {
    if (!open) return;
    const [p, s, st] = await Promise.all([
      (supabase as any).from("exam_result_publications").select("*").eq("exam_id", examId).order("created_at", { ascending: false }),
      (supabase as any).from("class_sections").select("id,name,academic_classes(name)").eq("school_id", schoolId),
      (supabase as any).from("student_enrollments")
        .select("class_section_id,students!inner(id,first_name,last_name,school_id)")
        .eq("school_id", schoolId).is("end_date", null).limit(2000),
    ]);
    setPubs(p.data || []);
    setSections((s.data || []).map((x: any) => ({ id: x.id, name: x.name, class_name: x.academic_classes?.name })));
    setStudents((st.data || []).map((e: any) => ({
      id: e.students.id, first_name: e.students.first_name, last_name: e.students.last_name,
      class_section_id: e.class_section_id,
    })));
    setExamPublishAt(resultPublishedAt ? resultPublishedAt.slice(0, 16) : "");
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [open, examId]);

  const studentsInClass = students.filter((s) => !studClassId || s.class_section_id === studClassId);

  const publishExam = async (publish: boolean) => {
    const patch: any = {
      result_published: publish,
      result_published_at: publish ? (examPublishAt ? new Date(examPublishAt).toISOString() : new Date().toISOString()) : null,
    };
    const { error } = await (supabase as any).from("exams").update(patch).eq("id", examId);
    if (error) return toast.error(error.message);

    // upsert exam-scope publication record for history
    await (supabase as any).from("exam_result_publications").upsert(
      {
        school_id: schoolId, exam_id: examId, scope: "exam",
        is_published: publish,
        publish_at: patch.result_published_at,
        notes: examNotes || null,
        created_by: user?.id ?? null,
      },
      { onConflict: "exam_id", ignoreDuplicates: false } as any
    );

    const { data: notified } = await (supabase as any).rpc("notify_exam_result_publish", {
      _exam_id: examId,
      _scope: "exam",
      _is_published: publish,
      _section_id: null,
      _student_id: null,
      _message: examNotes || null,
    });

    toast.success(
      `${publish ? "Results published" : "Results unpublished"} — ${notified ?? 0} recipients notified`
    );
    setExamNotes("");
    onUpdated();
    load();
  };

  const addSection = async () => {
    if (!secId) return toast.error("Pick a section");
    const { error } = await (supabase as any).from("exam_result_publications").upsert(
      {
        school_id: schoolId, exam_id: examId, scope: "section",
        class_section_id: secId,
        is_published: secPublished,
        publish_at: secAt ? new Date(secAt).toISOString() : null,
        notes: secNotes || null,
        created_by: user?.id ?? null,
      },
      { onConflict: "exam_id,class_section_id" } as any
    );
    if (error) return toast.error(error.message);
    const { data: notified } = await (supabase as any).rpc("notify_exam_result_publish", {
      _exam_id: examId, _scope: "section", _is_published: secPublished,
      _section_id: secId, _student_id: null, _message: secNotes || null,
    });
    toast.success(`Section rule saved — ${notified ?? 0} notified`);
    setSecId(""); setSecAt(""); setSecNotes(""); setSecPublished(true);
    load();
  };

  const addStudent = async () => {
    if (!studId) return toast.error("Pick a student");
    const { error } = await (supabase as any).from("exam_result_publications").upsert(
      {
        school_id: schoolId, exam_id: examId, scope: "student",
        student_id: studId,
        is_published: studPublished,
        publish_at: studAt ? new Date(studAt).toISOString() : null,
        notes: studNotes || null,
        created_by: user?.id ?? null,
      },
      { onConflict: "exam_id,student_id" } as any
    );
    if (error) return toast.error(error.message);
    const { data: notified } = await (supabase as any).rpc("notify_exam_result_publish", {
      _exam_id: examId, _scope: "student", _is_published: studPublished,
      _section_id: null, _student_id: studId, _message: studNotes || null,
    });
    toast.success(`Student rule saved — ${notified ?? 0} notified`);
    setStudId(""); setStudAt(""); setStudNotes(""); setStudPublished(true);
    load();
  };


  const removePub = async (id: string) => {
    const { error } = await (supabase as any).from("exam_result_publications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rule removed");
    load();
  };

  const sectionName = (id: string | null) => {
    const s = sections.find((x) => x.id === id);
    return s ? `${s.class_name ? s.class_name + " — " : ""}${s.name}` : "—";
  };
  const studentName = (id: string | null) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Publish Results — {examName}</DialogTitle>
        </DialogHeader>

        <div className="mb-3 flex items-center gap-2">
          <Badge variant={resultPublished ? "default" : "secondary"}>
            {resultPublished ? "Published" : "Unpublished"}
          </Badge>
          {resultPublishedAt && <span className="text-xs text-muted-foreground">on {format(new Date(resultPublishedAt), "PPp")}</span>}
        </div>

        <Tabs defaultValue="exam">
          <TabsList>
            <TabsTrigger value="exam"><Globe className="mr-1 h-4 w-4" />Whole exam</TabsTrigger>
            <TabsTrigger value="section"><Users className="mr-1 h-4 w-4" />By class/section</TabsTrigger>
            <TabsTrigger value="student"><User className="mr-1 h-4 w-4" />Individual student</TabsTrigger>
          </TabsList>

          <TabsContent value="exam" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Publish date/time (optional)</Label>
                <Input type="datetime-local" value={examPublishAt} onChange={(e) => setExamPublishAt(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Defaults to now if blank.</p>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={examNotes} onChange={(e) => setExamNotes(e.target.value)} placeholder="Announcement note (optional)" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => publishExam(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Publish all results</Button>
              <Button variant="outline" onClick={() => publishExam(false)}><XCircle className="mr-1 h-4 w-4" />Unpublish</Button>
            </div>
          </TabsContent>

          <TabsContent value="section" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class / Section</Label>
                <Select value={secId} onValueChange={setSecId}>
                  <SelectTrigger><SelectValue placeholder="Pick section" /></SelectTrigger>
                  <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.class_name ? s.class_name + " — " : ""}{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Publish date/time (optional)</Label>
                <Input type="datetime-local" value={secAt} onChange={(e) => setSecAt(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={secPublished} onCheckedChange={setSecPublished} id="sec-pub" />
              <Label htmlFor="sec-pub">{secPublished ? "Publish" : "Hide"}</Label>
            </div>
            <Textarea rows={2} placeholder="Notes" value={secNotes} onChange={(e) => setSecNotes(e.target.value)} />
            <Button onClick={addSection}>Save rule</Button>
          </TabsContent>

          <TabsContent value="student" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student</Label>
                <Select value={studId} onValueChange={setStudId}>
                  <SelectTrigger><SelectValue placeholder="Pick student" /></SelectTrigger>
                  <SelectContent className="max-h-72">{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Publish date/time (optional)</Label>
                <Input type="datetime-local" value={studAt} onChange={(e) => setStudAt(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={studPublished} onCheckedChange={setStudPublished} id="stud-pub" />
              <Label htmlFor="stud-pub">{studPublished ? "Publish" : "Hide"}</Label>
            </div>
            <Textarea rows={2} placeholder="Notes (e.g. withheld pending fee clearance)" value={studNotes} onChange={(e) => setStudNotes(e.target.value)} />
            <Button onClick={addStudent}>Save rule</Button>
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold">Publish rules / history</h4>
          <div className="rounded-md border max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pubs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No overrides.</TableCell></TableRow>}
                {pubs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="capitalize">{p.scope}</TableCell>
                    <TableCell>{p.scope === "section" ? sectionName(p.class_section_id) : p.scope === "student" ? studentName(p.student_id) : "All"}</TableCell>
                    <TableCell><Badge variant={p.is_published ? "default" : "secondary"}>{p.is_published ? "Published" : "Hidden"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.publish_at ? format(new Date(p.publish_at), "PP p") : "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removePub(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
