import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Link as LinkIcon, FileDown, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { useSchoolDocument } from "@/hooks/useSchoolDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BrandedDocument } from "@/components/pdf/BrandedDocument";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  position: string | null;
  department: string | null;
  employment_type: string | null;
  joining_date: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact: string | null;
  notes: string | null;
  is_active: boolean;
  linked_user_id: string | null;
};

const empty: Partial<Row> = {
  full_name: "",
  email: "",
  phone: "",
  cnic: "",
  position: "",
  department: "",
  employment_type: "full_time",
  joining_date: "",
  date_of_birth: "",
  gender: "",
  address: "",
  emergency_contact: "",
  notes: "",
  is_active: true,
};

/**
 * Record-only HR staff directory tab.
 * Used by HR managers to track employees that don't have (or don't yet need)
 * a system login. Once an account is created later, the row can be linked
 * via `linked_user_id` from the regular Staff Directory.
 */
export function StaffDirectoryTab() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const { school } = useSchoolDocument(schoolId);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("hr_staff_directory")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data as Row[]) || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.email, r.phone, r.cnic, r.position, r.department]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing({ ...empty });
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing({ ...row });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!schoolId || !editing) return;
    if (!editing.full_name || !String(editing.full_name).trim()) {
      toast.error("Full name is required");
      return;
    }
    const payload: any = {
      school_id: schoolId,
      full_name: String(editing.full_name).trim(),
      email: editing.email || null,
      phone: editing.phone || null,
      cnic: editing.cnic || null,
      position: editing.position || null,
      department: editing.department || null,
      employment_type: editing.employment_type || null,
      joining_date: editing.joining_date || null,
      date_of_birth: editing.date_of_birth || null,
      gender: editing.gender || null,
      address: editing.address || null,
      emergency_contact: editing.emergency_contact || null,
      notes: editing.notes || null,
      is_active: editing.is_active ?? true,
    };
    let error;
    if (editing.id) {
      ({ error } = await (supabase as any)
        .from("hr_staff_directory")
        .update(payload)
        .eq("id", editing.id));
    } else {
      payload.created_by = user?.id || null;
      ({ error } = await (supabase as any).from("hr_staff_directory").insert(payload));
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Staff record updated" : "Staff record added");
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete ${row.full_name}? This cannot be undone.`)) return;
    const { error } = await (supabase as any).from("hr_staff_directory").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Staff record removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" /> Record-only Staff
          </h3>
          <p className="text-xs text-muted-foreground">
            Employees tracked by HR without a system login. Link to an account later when ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[220px]"
            />
          </div>
          <Button variant="outline" onClick={() => setExportOpen(true)} disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No record-only staff yet. Click "Add Staff" to create one.</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name}</div>
                      {r.cnic && <div className="text-[11px] text-muted-foreground font-mono">{r.cnic}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.position || "—"}</TableCell>
                    <TableCell className="text-sm">{r.department || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.email && <div>{r.email}</div>}
                      {r.phone && <div className="text-muted-foreground">{r.phone}</div>}
                      {!r.email && !r.phone && "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.joining_date ? new Date(r.joining_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      {r.linked_user_id ? (
                        <Badge variant="default" className="gap-1"><LinkIcon className="h-3 w-3" /> Linked</Badge>
                      ) : r.is_active ? (
                        <Badge variant="secondary">No login</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit staff record" : "Add staff (record-only, no login)"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name *">
                <Input value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </Field>
              <Field label="Position">
                <Input value={editing.position || ""} onChange={(e) => setEditing({ ...editing, position: e.target.value })} placeholder="e.g. Math Teacher" />
              </Field>
              <Field label="Department">
                <Input value={editing.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} />
              </Field>
              <Field label="Employment type">
                <Select value={editing.employment_type || "full_time"} onValueChange={(v) => setEditing({ ...editing, employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="visiting">Visiting</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Email">
                <Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="CNIC / National ID">
                <Input value={editing.cnic || ""} onChange={(e) => setEditing({ ...editing, cnic: e.target.value })} />
              </Field>
              <Field label="Gender">
                <Select value={editing.gender || ""} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Joining date">
                <Input type="date" value={editing.joining_date || ""} onChange={(e) => setEditing({ ...editing, joining_date: e.target.value })} />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={editing.date_of_birth || ""} onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })} />
              </Field>
              <Field label="Emergency contact" className="sm:col-span-2">
                <Input value={editing.emergency_contact || ""} onChange={(e) => setEditing({ ...editing, emergency_contact: e.target.value })} placeholder="Name & phone" />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Textarea rows={2} value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing?.id ? "Save changes" : "Add staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branded export dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Staff Directory · Branded Export</span>
              <ExportPdfButton targetRef={exportRef} filename={`staff-directory-${schoolSlug}.pdf`} />
            </DialogTitle>
          </DialogHeader>
          <BrandedDocument
            ref={exportRef}
            school={school}
            documentTitle="Staff Directory"
            referenceNumber={`HR-DIR-${new Date().getFullYear()}`}
            signatoryName="HR Manager"
            signatoryTitle="Human Resources"
          >
            <h2 className="text-lg font-bold mb-3">Staff Directory ({filtered.length})</h2>
            <table className="w-full text-[11.5px] border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-2 border border-slate-300">#</th>
                  <th className="text-left p-2 border border-slate-300">Name</th>
                  <th className="text-left p-2 border border-slate-300">Position</th>
                  <th className="text-left p-2 border border-slate-300">Department</th>
                  <th className="text-left p-2 border border-slate-300">Phone</th>
                  <th className="text-left p-2 border border-slate-300">Email</th>
                  <th className="text-left p-2 border border-slate-300">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-2 border border-slate-300">{i + 1}</td>
                    <td className="p-2 border border-slate-300 font-medium">{r.full_name}</td>
                    <td className="p-2 border border-slate-300">{r.position || "—"}</td>
                    <td className="p-2 border border-slate-300">{r.department || "—"}</td>
                    <td className="p-2 border border-slate-300">{r.phone || "—"}</td>
                    <td className="p-2 border border-slate-300">{r.email || "—"}</td>
                    <td className="p-2 border border-slate-300">{r.joining_date ? new Date(r.joining_date).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BrandedDocument>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
