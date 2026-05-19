import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Download, Loader2, Trash2, Users, User, Eye, CheckCircle2, XCircle, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";


import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { generateVoucherPdf, type VoucherCopyData } from "@/lib/fee-voucher-pdf";

type FeePlan = { id: string; name: string; currency: string; class_id: string | null };
type FeePlanItem = { id: string; fee_plan_id: string; label: string; amount: number; sort_order: number };
type Klass = { id: string; name: string; grade_level: number | null };
type Section = { id: string; class_id: string; name: string };
type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  roll_number: string | null;
  student_code: string | null;
  parent_name: string | null;
  parent_phone: string | null;
};
type Batch = {
  id: string;
  scope: string;
  period_label: string | null;
  due_date: string;
  total_students: number;
  total_amount: number;
  created_at: string;
  notes: string | null;
};
type GradeTier = { id: string; minGrade: number; discountPct: number };

const SENTINEL = "__all";

export default function FeeVouchersModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deliveriesBatch, setDeliveriesBatch] = useState<Batch | null>(null);

  const { data: batches = [] } = useQuery({
    queryKey: ["fee_voucher_batches", schoolId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fee_voucher_batches")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Batch[];
    },
    enabled: !!schoolId,
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Fee Vouchers
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate professional fee vouchers for individuals or entire classes. Parents are notified automatically.
            </p>
          </div>
          <Button variant="hero" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Generate Voucher
          </Button>
        </CardHeader>
      </Card>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Recent batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No voucher batches yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{b.scope}</Badge></TableCell>
                    <TableCell>{b.period_label ?? "—"}</TableCell>
                    <TableCell>{b.due_date}</TableCell>
                    <TableCell className="text-right">{b.total_students}</TableCell>
                    <TableCell className="text-right font-medium">
                      {b.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDeliveriesBatch(b)}>
                        <Mail className="mr-1 h-3 w-3" /> Deliveries
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GenerateVoucherDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) qc.invalidateQueries({ queryKey: ["fee_voucher_batches", schoolId] });
        }}
        schoolId={schoolId}
      />

      <DeliveriesDialog batch={deliveriesBatch} onClose={() => setDeliveriesBatch(null)} />
    </div>
  );
}

type Delivery = {
  id: string;
  invoice_id: string;
  student_id: string;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_user_id: string | null;
  channel: string;
  status: string;
  error: string | null;
  delivered_at: string;
};

function DeliveriesDialog({ batch, onClose }: { batch: Batch | null; onClose: () => void }) {
  const open = !!batch;
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["fee_voucher_deliveries", batch?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fee_voucher_deliveries")
        .select("id,invoice_id,student_id,guardian_name,guardian_email,guardian_phone,guardian_user_id,channel,status,error,delivered_at")
        .eq("batch_id", batch!.id)
        .order("delivered_at", { ascending: true });
      if (error) throw error;
      return data as Delivery[];
    },
    enabled: open,
  });

  const sent = deliveries.filter((d) => d.status === "sent").length;
  const noAcct = deliveries.filter((d) => d.status === "no_account").length;
  const failed = deliveries.filter((d) => !["sent", "no_account"].includes(d.status)).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Delivery status</DialogTitle>
          <DialogDescription>
            {sent} delivered · {noAcct} no parent account · {failed} failed
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : deliveries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No delivery records.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.guardian_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {d.guardian_email ?? ""}{d.guardian_phone ? ` · ${d.guardian_phone}` : ""}
                    </TableCell>
                    <TableCell><Badge variant="outline">{d.channel}</Badge></TableCell>
                    <TableCell>
                      {d.status === "sent" ? (
                        <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Sent
                        </Badge>
                      ) : d.status === "no_account" ? (
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/40">
                          <AlertCircle className="mr-1 h-3 w-3" /> No app account
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" /> {d.status}
                        </Badge>
                      )}
                      {d.error && <div className="text-[10px] text-destructive mt-1">{d.error}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.delivered_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateVoucherDialog({
  open,
  onOpenChange,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string | null;
}) {
  const [mode, setMode] = useState<"individual" | "class">("individual");
  const [feePlanId, setFeePlanId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>(SENTINEL);
  const [studentId, setStudentId] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState<string>(`Voucher ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [discountPct, setDiscountPct] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tiers, setTiers] = useState<GradeTier[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [doneCount, setDoneCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [results, setResults] = useState<Array<{ studentId: string; name: string; status: "success" | "error"; error?: string; invoiceId?: string }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewSeqRef = useRef(0);


  // Data queries
  const { data: feePlans = [] } = useQuery({
    queryKey: ["fp_for_vouchers", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_plans")
        .select("id,name,currency,class_id")
        .eq("school_id", schoolId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FeePlan[];
    },
    enabled: !!schoolId && open,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes_for_vouchers", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_classes")
        .select("id,name,grade_level")
        .eq("school_id", schoolId!)
        .order("grade_level", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Klass[];
    },
    enabled: !!schoolId && open,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections_for_vouchers", schoolId, classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_sections")
        .select("id,class_id,name")
        .eq("school_id", schoolId!)
        .eq("class_id", classId)
        .order("name");
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!schoolId && open && !!classId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students_for_vouchers", schoolId, classId, sectionId],
    queryFn: async () => {
      let sectionIds: string[] = [];
      if (sectionId !== SENTINEL) sectionIds = [sectionId];
      else sectionIds = sections.map((s) => s.id);
      if (sectionIds.length === 0) return [] as Student[];

      const { data: enrolls, error: e1 } = await supabase
        .from("student_enrollments")
        .select("student_id")
        .eq("school_id", schoolId!)
        .in("class_section_id", sectionIds)
        .is("end_date", null);
      if (e1) throw e1;
      const ids = Array.from(new Set((enrolls ?? []).map((r: any) => r.student_id)));
      if (ids.length === 0) return [] as Student[];

      const { data, error } = await supabase
        .from("students")
        .select("id,first_name,last_name,roll_number,student_code,parent_name,parent_phone")
        .in("id", ids)
        .order("first_name");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!schoolId && open && !!classId && (sectionId === SENTINEL ? sections.length > 0 : true),
  });

  const planItems = useQuery({
    queryKey: ["plan_items_for_vouchers", feePlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_plan_items")
        .select("id,fee_plan_id,label,amount,sort_order")
        .eq("fee_plan_id", feePlanId)
        .order("sort_order");
      if (error) throw error;
      return data as FeePlanItem[];
    },
    enabled: !!feePlanId,
  });

  const subtotal = useMemo(
    () => (planItems.data ?? []).reduce((s, i) => s + Number(i.amount || 0), 0),
    [planItems.data],
  );

  const targetStudents = useMemo<Student[]>(() => {
    if (mode === "individual") {
      return students.filter((s) => s.id === studentId);
    }
    return students;
  }, [mode, students, studentId]);

  function addTier() {
    setTiers((t) => [...t, { id: crypto.randomUUID(), minGrade: 80, discountPct: 10 }]);
  }
  function removeTier(id: string) {
    setTiers((t) => t.filter((x) => x.id !== id));
  }

  async function fetchSchoolMeta() {
    const { data: school } = await supabase
      .from("schools")
      .select("id,name,address,phone,email,website,motto,logo_url")
      .eq("id", schoolId!)
      .maybeSingle();
    const { data: branding } = await (supabase as any)
      .from("school_branding")
      .select("accent_hue,accent_saturation,accent_lightness")
      .eq("school_id", schoolId!)
      .maybeSingle();
    return {
      school,
      branding: branding
        ? {
            h: Number(branding.accent_hue ?? 210),
            s: Number(branding.accent_saturation ?? 100),
            l: Number(branding.accent_lightness ?? 50),
          }
        : { h: 210, s: 100, l: 50 },
    };
  }

  async function getStudentAvgGrade(studentIds: string[]): Promise<Record<string, number>> {
    if (studentIds.length === 0) return {};
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const { data: assess } = await supabase
      .from("academic_assessments")
      .select("id,max_marks")
      .eq("school_id", schoolId!)
      .gte("created_at", since.toISOString());
    const maxById = new Map<string, number>((assess ?? []).map((a: any) => [a.id, Number(a.max_marks || 100)]));
    const ids = (assess ?? []).map((a: any) => a.id);
    if (ids.length === 0) return {};
    const { data: marks } = await supabase
      .from("student_marks")
      .select("student_id,assessment_id,marks")
      .in("student_id", studentIds)
      .in("assessment_id", ids);
    const totals = new Map<string, { sum: number; count: number }>();
    (marks ?? []).forEach((m: any) => {
      const max = maxById.get(m.assessment_id) || 100;
      if (max <= 0 || m.marks == null) return;
      const pct = (Number(m.marks) / max) * 100;
      const t = totals.get(m.student_id) ?? { sum: 0, count: 0 };
      t.sum += pct;
      t.count += 1;
      totals.set(m.student_id, t);
    });
    const out: Record<string, number> = {};
    totals.forEach((v, k) => {
      out[k] = v.count > 0 ? v.sum / v.count : 0;
    });
    return out;
  }

  function pickGradeTierPct(avg: number): { pct: number; tier: GradeTier | null } {
    const sorted = [...tiers].sort((a, b) => b.minGrade - a.minGrade);
    for (const t of sorted) {
      if (avg >= t.minGrade) return { pct: t.discountPct, tier: t };
    }
    return { pct: 0, tier: null };
  }

  async function handleGenerate() {
    if (!schoolId || !feePlanId) {
      toast.error("Pick a fee plan first");
      return;
    }
    if (mode === "individual" && !studentId) {
      toast.error("Pick a student");
      return;
    }
    if (mode === "class" && targetStudents.length === 0) {
      toast.error("No students in selected class/section");
      return;
    }

    setSubmitting(true);
    setProgress("Loading school branding…");
    try {
      const meta = await fetchSchoolMeta();
      const plan = feePlans.find((p) => p.id === feePlanId);
      const items = planItems.data ?? [];
      const gradeMap = tiers.length > 0 ? await getStudentAvgGrade(targetStudents.map((s) => s.id)) : {};

      // Create batch row
      const { data: batch, error: batchErr } = await (supabase as any)
        .from("fee_voucher_batches")
        .insert({
          school_id: schoolId,
          scope: mode === "individual" ? "individual" : sectionId === SENTINEL ? "class" : "section",
          class_id: classId || null,
          class_section_id: sectionId !== SENTINEL ? sectionId : null,
          fee_plan_id: feePlanId,
          period_label: periodLabel,
          due_date: dueDate,
          default_discount_pct: Number(discountPct) || 0,
          grade_discount_tiers: tiers.map((t) => ({ min_grade: t.minGrade, discount_pct: t.discountPct })),
          notes,
          total_students: 0,
          total_amount: 0,
        })
        .select()
        .single();
      if (batchErr) throw batchErr;

      let totalAmount = 0;
      let successCount = 0;
      const pdfs: { student: Student; data: VoucherCopyData }[] = [];

      for (let i = 0; i < targetStudents.length; i++) {
        const st = targetStudents[i];
        setProgress(`Generating ${i + 1} / ${targetStudents.length}…`);

        // Compute extra discount: manual + grade tier
        const baseExtraPct = Number(discountPct) || 0;
        const baseExtraAmt = Number(discountAmount) || 0;
        const avg = gradeMap[st.id] ?? 0;
        const { pct: gradePct, tier } = pickGradeTierPct(avg);
        const totalExtraPct = baseExtraPct + gradePct;
        const reasonParts: string[] = [];
        if (discountReason) reasonParts.push(discountReason);
        if (tier) reasonParts.push(`Merit ≥${tier.minGrade}% → ${tier.discountPct}%`);
        const reason = reasonParts.join(" | ") || null;

        const { data: invId, error: rpcErr } = await (supabase as any).rpc("generate_fee_voucher", {
          _school_id: schoolId,
          _student_id: st.id,
          _fee_plan_id: feePlanId,
          _period_label: periodLabel,
          _due_date: dueDate,
          _extra_discount_pct: totalExtraPct,
          _extra_discount_amount: baseExtraAmt,
          _extra_discount_reason: reason,
          _notes: notes || null,
          _batch_id: batch.id,
        });
        if (rpcErr) {
          console.error("voucher rpc failed", st.id, rpcErr);
          toast.error(`Failed for ${st.first_name}: ${rpcErr.message}`);
          continue;
        }

        // Load full invoice row for PDF
        const { data: inv } = await supabase
          .from("fee_invoices")
          .select("*")
          .eq("id", invId as string)
          .maybeSingle();
        if (!inv) continue;

        // Get class/section name
        const sec = sections.find((s) => s.id === sectionId) || sections.find((s) => true);
        const klass = classes.find((c) => c.id === classId);

        const pdfData: VoucherCopyData = {
          invoiceNumber: (inv as any).invoice_number,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate,
          periodLabel,
          school: {
            name: meta.school?.name ?? "School",
            address: meta.school?.address ?? null,
            phone: meta.school?.phone ?? null,
            email: meta.school?.email ?? null,
            website: meta.school?.website ?? null,
            logoUrl: meta.school?.logo_url ?? null,
            motto: meta.school?.motto ?? null,
          },
          student: {
            name: `${st.first_name} ${st.last_name ?? ""}`.trim(),
            rollNumber: st.roll_number,
            studentCode: st.student_code,
            className: klass?.name ?? null,
            sectionName: sec?.name ?? null,
            parentName: st.parent_name,
            parentPhone: st.parent_phone,
          },
          items: items.map((it) => ({ label: it.label, amount: Number(it.amount) })),
          subtotal: Number((inv as any).subtotal),
          baseDiscount: Number((inv as any).discount_amount),
          meritDiscount: Number((inv as any).merit_discount_amount ?? 0),
          meritReason: (inv as any).merit_discount_reason ?? reason,
          siblingDiscount: Number((inv as any).sibling_discount_amount ?? 0),
          total: Number((inv as any).total_amount),
          currency: plan?.currency || "PKR",
          accentHsl: meta.branding,
          notes: notes || null,
        };

        pdfs.push({ student: st, data: pdfData });
        totalAmount += Number((inv as any).total_amount);
        successCount += 1;
      }

      // Update batch totals
      await (supabase as any)
        .from("fee_voucher_batches")
        .update({ total_students: successCount, total_amount: totalAmount })
        .eq("id", batch.id);

      // Generate the PDFs
      setProgress("Building PDF file…");
      if (pdfs.length === 1) {
        const doc = generateVoucherPdf(pdfs[0].data);
        doc.save(`voucher-${pdfs[0].data.invoiceNumber}.pdf`);
      } else if (pdfs.length > 1) {
        const { appendVoucherPage } = await import("@/lib/fee-voucher-pdf");
        const combined = generateVoucherPdf(pdfs[0].data);
        for (let i = 1; i < pdfs.length; i++) {
          appendVoucherPage(combined, pdfs[i].data);
        }
        combined.save(`vouchers-batch-${batch.id}.pdf`);
      }

      toast.success(`Generated ${successCount} voucher(s); parents notified.`);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to generate vouchers");
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Fee Voucher</DialogTitle>
          <DialogDescription>
            Create professional vouchers for one student or an entire class. Parents are notified automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="individual">
                <User className="mr-2 h-4 w-4" /> Individual Student
              </TabsTrigger>
              <TabsTrigger value="class">
                <Users className="mr-2 h-4 w-4" /> Whole Class / Section
              </TabsTrigger>
            </TabsList>

            <div className="grid gap-3 mt-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fee plan</Label>
                <Select value={feePlanId} onValueChange={setFeePlanId}>
                  <SelectTrigger><SelectValue placeholder="Select fee plan" /></SelectTrigger>
                  <SelectContent>
                    {feePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {feePlanId && (
                  <p className="text-xs text-muted-foreground">
                    Subtotal per student: {subtotal.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Period label</Label>
                <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(SENTINEL); setStudentId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setStudentId(""); }}>
                  <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SENTINEL}>All sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "individual" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label>Student</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name ?? ""} {s.roll_number ? `(${s.roll_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Discount %</Label>
                <Input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Discount (fixed amount)</Label>
                <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Discount reason</Label>
                <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="e.g. Term promotion" />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <TabsContent value="class" className="mt-4 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Grade-based merit discount</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Students whose average grade meets a tier get extra % discount. Highest matching tier applies.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tiers.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="text-xs">If avg ≥</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={t.minGrade}
                        onChange={(e) => setTiers((arr) => arr.map((x) => x.id === t.id ? { ...x, minGrade: Number(e.target.value) } : x))}
                      />
                      <span className="text-xs">% → discount</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={t.discountPct}
                        onChange={(e) => setTiers((arr) => arr.map((x) => x.id === t.id ? { ...x, discountPct: Number(e.target.value) } : x))}
                      />
                      <span className="text-xs">%</span>
                      <Button size="icon" variant="ghost" onClick={() => removeTier(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTier}>
                    <Plus className="mr-1 h-3 w-3" /> Add tier
                  </Button>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground">
                {students.length} student(s) will receive a voucher.
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-2">
          {progress && <span className="text-xs text-muted-foreground self-center mr-auto">{progress}</span>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="hero" onClick={handleGenerate} disabled={submitting || !feePlanId}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate {mode === "individual" ? "Voucher" : `${students.length} Vouchers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
