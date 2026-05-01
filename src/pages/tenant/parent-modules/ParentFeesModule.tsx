import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { CheckCircle2, CreditCard, Loader2, XCircle, Clock, RefreshCw, Download, Receipt, Printer, Wallet, AlertCircle, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

// Map raw errors from jazzcash-initiate / network to user-friendly messages
function friendlyError(raw: string): string {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("not configured")) return "JazzCash is not yet set up by your school. Please contact the school office.";
  if (msg.includes("already paid")) return "This invoice has already been paid.";
  if (msg.includes("invoice not found")) return "We couldn't find this invoice. Please refresh and try again.";
  if (msg.includes("unauthorized")) return "Your session has expired. Please sign in again.";
  if (msg.includes("invoice_id required")) return "Something went wrong selecting this invoice. Please retry.";
  if (msg.includes("popup")) return "Your browser blocked the payment window. Please allow popups and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "Network problem reaching JazzCash. Check your connection and try again.";
  if (msg.includes("failed to start")) return "JazzCash didn't respond. Please try again in a moment.";
  return raw || "Payment couldn't be started. Please try again.";
}

function buildReceiptText(t: JcTxn, inv: InvoiceRecord | undefined, studentName: string): string {
  const lines = [
    "JAZZCASH PAYMENT RECEIPT",
    "========================",
    `Date:       ${new Date(t.created_at).toLocaleString()}`,
    `Reference:  ${t.txn_ref_no}`,
    `Invoice:    ${inv?.invoice_number || "—"}`,
    `Student:    ${studentName}`,
    `Method:     JazzCash`,
    `Status:     ${t.status.toUpperCase()}`,
    `Amount:     PKR ${Number(t.amount).toLocaleString()}`,
    "",
    t.jc_response_message ? `Note: ${t.jc_response_message}` : "",
    "",
    "Keep this receipt for your records.",
  ];
  return lines.filter(Boolean).join("\n");
}

function downloadReceipt(text: string, ref: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jazzcash-receipt-${ref}.txt`;
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

  const txnIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };
  const txnBadgeVariant = (status: string): any => status === "success" ? "default" : status === "failed" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Fees</h1>
        <p className="text-muted-foreground">View fee invoices and payment status for {child.first_name || "your child"}</p>
      </div>

      {totalOutstanding > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive"><strong>Outstanding Balance:</strong> PKR {totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices found.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Period</TableHead><TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map(inv => {
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
                        {due > 0 && jcEnabled && (
                          <Button size="sm" onClick={() => payNow(inv.id)} disabled={paying === inv.id}>
                            {paying === inv.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CreditCard className="h-3 w-3 mr-1" />}
                            Pay Now
                          </Button>
                        )}
                        {due > 0 && !jcEnabled && (
                          <span className="text-xs text-muted-foreground">Online payment unavailable</span>
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
