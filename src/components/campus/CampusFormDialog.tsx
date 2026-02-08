import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Campus, CampusFormData } from "@/hooks/useCampuses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campus?: Campus | null;
  onSubmit: (data: CampusFormData & { id?: string }) => void;
  isPending: boolean;
}

export function CampusFormDialog({ open, onOpenChange, campus, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CampusFormData>({
    name: "",
    code: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    is_active: true,
    is_main: false,
    student_capacity: undefined,
  });

  useEffect(() => {
    if (campus) {
      setForm({
        name: campus.name,
        code: campus.code,
        address: campus.address || "",
        city: campus.city || "",
        phone: campus.phone || "",
        email: campus.email || "",
        is_active: campus.is_active,
        is_main: campus.is_main,
        student_capacity: campus.student_capacity ?? undefined,
      });
    } else {
      setForm({
        name: "",
        code: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
        is_main: false,
        student_capacity: undefined,
      });
    }
  }, [campus, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    onSubmit(campus ? { ...form, id: campus.id } : form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campus ? "Edit Campus" : "Add New Campus"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Campus Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Main Campus"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Campus Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MAIN"
                required
                maxLength={10}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="123 School Road"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Student Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={form.student_capacity ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    student_capacity: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="campus@school.edu"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_main"
                checked={form.is_main}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_main: v }))}
              />
              <Label htmlFor="is_main">Main Campus</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : campus ? "Update Campus" : "Create Campus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
