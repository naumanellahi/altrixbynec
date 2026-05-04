import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { CheckCircle2, CreditCard, Loader2, XCircle, Clock, RefreshCw, Download, Receipt, Printer, Wallet, AlertCircle, History, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ParentFeesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  period_label: string | null;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
}

interface JcTxn {
  id: string;
  invoice_id: string;
  txn_ref_no: string;
  amount: number;
  status: string;
  jc_response_message: string | null;
  created_at: string;
  provider?: "jazzcash" | "easypaisa";
}

// Map raw errors from initiate functions / network to user-friendly messages
function friendlyError(raw: string, provider: string = "online payment"): string {
  const msg = (raw || "").toLowerCase();
  const label = provider === "easypaisa" ? "Easypaisa" : provider === "jazzcash" ? "JazzCash" : "Online payment";
  if (msg.includes("not configured")) return `${label} is not yet set up by your school. Please contact the school office.`;
  if (msg.includes("already paid")) return "This invoice has already been paid.";
  if (msg.includes("invoice not found")) return "We couldn't find this invoice. Please refresh and try again.";
  if (msg.includes("unauthorized")) return "Your session has expired. Please sign in again.";
  if (msg.includes("invoice_id required")) return "Something went wrong selecting this invoice. Please retry.";
  if (msg.includes("popup")) return "Your browser blocked the payment window. Please allow popups and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return `Network problem reaching ${label}. Check your connection and try again.`;
  if (msg.includes("failed to start")) return `${label} didn't respond. Please try again in a moment.`;
  return raw || "Payment couldn't be started. Please try again.";
}

function buildReceiptText(t: JcTxn, inv: InvoiceRecord | undefined, studentName: string): string {
  const methodLabel = t.provider === "easypaisa" ? "Easypaisa" : "JazzCash";
  const lines = [
    `${methodLabel.toUpperCase()} PAYMENT RECEIPT`,
    "========================",
    `Date:       ${new Date(t.created_at).toLocaleString()}`,
    `Reference:  ${t.txn_ref_no}`,
    `Invoice:    ${inv?.invoice_number || "—"}`,
    `Student:    ${studentName}`,
    `Method:     ${methodLabel}`,
    `Status:     ${t.status.toUpperCase()}`,
    `Amount:     PKR ${Number(t.amount).toLocaleString()}`,
    "",
    t.jc_response_message ? `Note: ${t.jc_response_message}` : "",
    "",
    "Keep this receipt for your records.",
  ];
  return lines.filter(Boolean).join("\n");
}

function downloadReceipt(text: string, ref: string, provider: string = "payment") {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${provider}-receipt-${ref}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ParentFeesModule = ({ child, schoolId }: ParentFeesModuleProps) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [jcEnabled, setJcEnabled] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [txns, setTxns] = useState<JcTxn[]>([]);
  const [receiptTxn, setReceiptTxn] = useState<JcTxn | null>(null);
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("__all");
  const [invFromDate, setInvFromDate] = useState("");
  const [invToDate, setInvToDate] = useState("");

  const printChallan = (inv: InvoiceRecord) => {
    const due = Math.max(Number(inv.total_amount) - Number(inv.paid_amount), 0);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Pop-up blocked. Allow pop-ups to print."); return; }
    const html = `<!doctype html><html><head><title>Fee Challan ${inv.invoice_number}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0a;padding:20px}
        .challan{border:1px dashed #888;padding:18px;margin-bottom:14px;border-radius:8px}
        h2{margin:0 0 6px;font-size:16px}
        .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px dotted #ddd}
        .total{font-size:16px;font-weight:700;margin-top:10px;padding-top:8px;border-top:2px solid #0a0a0a}
        .muted{color:#6b7280;font-size:11px}
        .copy-label{background:#0a0a0a;color:#fff;display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-bottom:8px}
        @media print{button{display:none}}
      </style></head><body>
      ${["School Copy","Bank Copy","Parent Copy"].map(label => `
        <div class="challan">
          <span class="copy-label">${label}</span>
          <h2>FEE PAYMENT CHALLAN</h2>
          <div class="muted">Invoice ${inv.invoice_number}</div>
          <div class="row"><span>Student</span><span>${child?.first_name || ""} ${child?.last_name || ""}</span></div>
          <div class="row"><span>Period</span><span>${inv.period_label || "—"}</span></div>
          <div class="row"><span>Due Date</span><span>${format(new Date(inv.due_date), "MMM d, yyyy")}</span></div>
          <div class="row"><span>Total</span><span>PKR ${Number(inv.total_amount).toLocaleString()}</span></div>
          <div class="row"><span>Paid</span><span>PKR ${Number(inv.paid_amount).toLocaleString()}</span></div>
          <div class="total">Amount Due: PKR ${due.toLocaleString()}</div>
          <div class="muted" style="margin-top:8px">Pay at the school office or your bank using this challan. Keep your copy as proof of payment.</div>
        </div>
      `).join("")}
      <script>setTimeout(()=>window.print(),250)</script>
      </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  useEffect(() => {
    if (!child || !schoolId) return;
    let cancelled = false;

    const loadInvoices = async () => {
      const { data } = await supabase.from("fee_invoices")
        .select("id, invoice_number, period_label, due_date, total_amount, paid_amount, status")
        .eq("school_id", schoolId).eq("student_id", child.student_id)
        .order("due_date", { ascending: false }).limit(100);
      if (!cancelled) setInvoices((data as InvoiceRecord[]) || []);
    };
    const loadJc = async () => {
      const { data } = await supabase.from("jazzcash_settings").select("is_enabled").eq("school_id", schoolId).maybeSingle();
      if (!cancelled) setJcEnabled(!!data?.is_enabled);
    };
    const loadTxns = async () => {
      const { data } = await supabase.from("jazzcash_transactions")
        .select("id, invoice_id, txn_ref_no, amount, status, jc_response_message, created_at")
        .eq("school_id", schoolId).eq("student_id", child.student_id)
        .order("created_at", { ascending: false }).limit(50);
      if (!cancelled) setTxns((data as JcTxn[]) || []);
    };

    (async () => {
      setLoading(true);
      await Promise.all([loadInvoices(), loadJc(), loadTxns()]);
      if (!cancelled) setLoading(false);
    })();

    const ch = supabase.channel(`pfees-${child.student_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fee_invoices", filter: `student_id=eq.${child.student_id}` }, loadInvoices)
      .on("postgres_changes", { event: "*", schema: "public", table: "jazzcash_settings", filter: `school_id=eq.${schoolId}` }, loadJc)
      .on("postgres_changes", { event: "*", schema: "public", table: "jazzcash_transactions", filter: `student_id=eq.${child.student_id}` }, (payload) => {
        loadTxns();
        const newRow = payload.new as JcTxn | undefined;
        if (newRow && payload.eventType === "UPDATE") {
          if (newRow.status === "success") toast.success(`Payment received for ${newRow.txn_ref_no}`);
          else if (newRow.status === "failed") toast.error(`Payment failed: ${newRow.jc_response_message || "Unknown reason"}`);
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [child, schoolId]);

  const payNow = async (invoiceId: string) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast.error(friendlyError("popup blocked"));
      return;
    }
    w.document.write('<p style="font-family:sans-serif;text-align:center;padding:40px">Preparing JazzCash checkout…</p>');
    setPaying(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("jazzcash-initiate", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      const errMsg = (data as any)?.error;
      if (errMsg) throw new Error(errMsg);
      const html = (data as any)?.html;
      if (!html) throw new Error("Failed to start checkout");
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e: any) {
      try { w.close(); } catch {}
      const friendly = friendlyError(e?.message || "");
      toast.error(friendly);
    } finally {
      setPaying(null);
    }
  };

  if (!child) {
    return <div className="text-center text-muted-foreground py-12">Please select a child to view fee status.</div>;
  }

  const statusVariant = (status: string): any => status === "paid" ? "default" : status === "overdue" ? "destructive" : status === "partial" ? "secondary" : "outline";
  const totalOutstanding = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Math.max(Number(i.total_amount) - Number(i.paid_amount), 0), 0);
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const successPaymentsTotal = txns.filter(t => t.status === "success").reduce((s, t) => s + Number(t.amount || 0), 0);
  const nextDue = invoices
    .filter(i => i.status !== "paid" && i.status !== "cancelled")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const txnIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };
  const txnBadgeVariant = (status: string): any => status === "success" ? "default" : status === "failed" ? "destructive" : "secondary";

  const filteredInvoices = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return invoices.filter(i => {
      if (invStatus !== "__all" && i.status !== invStatus) return false;
      if (invFromDate && i.due_date < invFromDate) return false;
      if (invToDate && i.due_date > invToDate) return false;
      if (q) {
        const hay = `${i.invoice_number} ${i.period_label || ""} ${i.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, invSearch, invStatus, invFromDate, invToDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Fees</h1>
        <p className="text-muted-foreground">View fee invoices and payment status for {child.first_name || "your child"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className={totalOutstanding > 0 ? "border-destructive/40 bg-destructive/5" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4" /><span className="uppercase tracking-wide">Outstanding</span>
            </div>
            <p className="mt-2 text-xl font-semibold">PKR {totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{overdueCount} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-4 w-4" /><span className="uppercase tracking-wide">Total Paid</span>
            </div>
            <p className="mt-2 text-xl font-semibold">PKR {totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">of PKR {totalBilled.toLocaleString()} billed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" /><span className="uppercase tracking-wide">Next Due</span>
            </div>
            <p className="mt-2 text-xl font-semibold">
              {nextDue ? format(new Date(nextDue.due_date), "MMM d") : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nextDue ? `PKR ${Math.max(Number(nextDue.total_amount) - Number(nextDue.paid_amount), 0).toLocaleString()}` : "Nothing pending"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="h-4 w-4" /><span className="uppercase tracking-wide">Online Paid</span>
            </div>
            <p className="mt-2 text-xl font-semibold">PKR {successPaymentsTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{txns.filter(t => t.status === "success").length} successful txns</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search invoice # or period…" className="pl-8 pr-8" />
              {invSearch && (
                <button type="button" onClick={() => setInvSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={invStatus} onValueChange={setInvStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="w-[150px]" value={invFromDate} onChange={e => setInvFromDate(e.target.value)} />
              <Label className="text-xs text-muted-foreground">to</Label>
              <Input type="date" className="w-[150px]" value={invToDate} onChange={e => setInvToDate(e.target.value)} />
            </div>
            {(invSearch || invStatus !== "__all" || invFromDate || invToDate) && (
              <Button size="sm" variant="ghost" onClick={() => { setInvSearch(""); setInvStatus("__all"); setInvFromDate(""); setInvToDate(""); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-muted-foreground">{invoices.length === 0 ? "No invoices found." : "No invoices match your search."}</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Period</TableHead><TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredInvoices.map(inv => {
                  const due = Math.max(Number(inv.total_amount) - Number(inv.paid_amount), 0);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.period_label || "—"}</TableCell>
                      <TableCell>{format(new Date(inv.due_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">PKR {Number(inv.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">PKR {due.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 flex-wrap">
                          {due > 0 && jcEnabled && (
                            <Button size="sm" onClick={() => payNow(inv.id)} disabled={paying === inv.id}>
                              {paying === inv.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CreditCard className="h-3 w-3 mr-1" />}
                              Pay Now
                            </Button>
                          )}
                          {due > 0 && !jcEnabled && (
                            <span className="text-xs text-muted-foreground">Online payment unavailable</span>
                          )}
                          {due > 0 && (
                            <Button size="sm" variant="outline" onClick={() => printChallan(inv)}>
                              <Printer className="h-3 w-3 mr-1" /> Challan
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
          <p className="text-sm text-muted-foreground">Live updates from your recent JazzCash payment attempts.</p>
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payment attempts yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {txns.map(t => {
                  const inv = invoices.find(i => i.id === t.invoice_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.created_at), "MMM d, h:mm a")}</TableCell>
                      <TableCell>{inv?.invoice_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.txn_ref_no}</TableCell>
                      <TableCell className="text-right">PKR {Number(t.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={txnBadgeVariant(t.status)} className="gap-1">
                          {txnIcon(t.status)}
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                        {t.jc_response_message || (t.status === "pending" ? "Awaiting confirmation from JazzCash…" : "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === "failed" && inv && Math.max(Number(inv.total_amount) - Number(inv.paid_amount), 0) > 0 && jcEnabled && (
                          <Button size="sm" variant="outline" onClick={() => payNow(t.invoice_id)} disabled={paying === t.invoice_id}>
                            {paying === t.invoice_id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Try again
                          </Button>
                        )}
                        {t.status === "success" && (
                          <Button size="sm" variant="outline" onClick={() => setReceiptTxn(t)}>
                            <Receipt className="h-3 w-3 mr-1" /> Receipt
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptTxn} onOpenChange={(o) => !o && setReceiptTxn(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {receiptTxn && (() => {
            const inv = invoices.find(i => i.id === receiptTxn.invoice_id);
            const receiptText = buildReceiptText(receiptTxn, inv, child?.first_name || "");
            return (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{receiptTxn.txn_ref_no}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span>{inv?.invoice_number || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span>{child?.first_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(receiptTxn.created_at), "MMM d, yyyy h:mm a")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>JazzCash</span></div>
                  <div className="flex justify-between font-semibold pt-2 border-t"><span>Amount Paid</span><span>PKR {Number(receiptTxn.amount).toLocaleString()}</span></div>
                  {receiptTxn.jc_response_message && (
                    <div className="text-xs text-muted-foreground pt-1">{receiptTxn.jc_response_message}</div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(receiptTxn.txn_ref_no);
                    toast.success("Reference copied");
                  }}>Copy reference</Button>
                  <Button onClick={() => downloadReceipt(receiptText, receiptTxn.txn_ref_no)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentFeesModule;
