import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  studentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  onUploaded?: () => void;
}

export function ManualProofUploadDialog({ open, onOpenChange, schoolId, studentId, invoiceId, invoiceNumber, amountDue, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState(String(amountDue || ""));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank_transfer");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setFile(null); setNote(""); setAmount(String(amountDue || "")); };

  const submit = async () => {
    if (!file) { toast.error("Please attach a receipt image or PDF"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("File too large (max 8MB)"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filePath = `${schoolId}/${invoiceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("fee-payment-proofs").upload(filePath, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from("fee_payment_proofs").insert({
        school_id: schoolId, invoice_id: invoiceId, student_id: studentId,
        uploaded_by: uid, file_path: filePath, file_name: file.name, mime_type: file.type,
        amount: amt, paid_at: paidAt, method, note,
      });
      if (insErr) throw insErr;

      toast.success("Proof uploaded — awaiting verification");
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload payment proof</DialogTitle>
          <DialogDescription>Invoice {invoiceNumber} — for staff verification</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Receipt (image or PDF)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (PKR)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Paid on</Label>
              <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Method</Label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash at office</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. paid via HBL, ref #..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Submit proof
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
