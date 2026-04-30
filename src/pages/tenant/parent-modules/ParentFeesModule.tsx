import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { CreditCard, Loader2 } from "lucide-react";
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

const ParentFeesModule = ({ child, schoolId }: ParentFeesModuleProps) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [jcEnabled, setJcEnabled] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (!child || !schoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [invRes, jcRes] = await Promise.all([
        supabase.from("fee_invoices").select("id, invoice_number, period_label, due_date, total_amount, paid_amount, status")
          .eq("school_id", schoolId).eq("student_id", child.student_id).order("due_date", { ascending: false }).limit(100),
        supabase.from("jazzcash_settings").select("is_enabled").eq("school_id", schoolId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (invRes.error) toast.error(invRes.error.message);
      setInvoices((invRes.data as InvoiceRecord[]) || []);
      setJcEnabled(!!jcRes.data?.is_enabled);
      setLoading(false);
    })();

    const ch = supabase.channel(`pfees-${child.student_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fee_invoices", filter: `student_id=eq.${child.student_id}` }, async () => {
        const { data } = await supabase.from("fee_invoices").select("id, invoice_number, period_label, due_date, total_amount, paid_amount, status")
          .eq("school_id", schoolId).eq("student_id", child.student_id).order("due_date", { ascending: false }).limit(100);
        if (!cancelled) setInvoices((data as InvoiceRecord[]) || []);
      }).subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [child, schoolId]);

  const payNow = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("jazzcash-initiate", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      const html = (data as any)?.html;
      if (!html) throw new Error("Failed to start checkout");
      const w = window.open("", "_blank");
      if (!w) { toast.error("Popup blocked. Please allow popups."); return; }
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed to start");
    } finally {
      setPaying(null);
    }
  };

  if (!child) {
    return <div className="text-center text-muted-foreground py-12">Please select a child to view fee status.</div>;
  }

  const statusVariant = (status: string): any => status === "paid" ? "default" : status === "overdue" ? "destructive" : status === "partial" ? "secondary" : "outline";
  const totalOutstanding = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Math.max(Number(i.total_amount) - Number(i.paid_amount), 0), 0);

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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentFeesModule;
