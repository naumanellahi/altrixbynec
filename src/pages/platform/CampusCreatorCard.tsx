import { useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type SchoolOption = { id: string; slug: string; name: string };

interface Props {
  schools: SchoolOption[];
  onCreated?: () => void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function CampusCreatorCard({ schools, onCreated }: Props) {
  const [schoolId, setSchoolId] = useState<string>("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const slugPreview = useMemo(() => slugify(slug || name), [slug, name]);

  const submit = async () => {
    if (!schoolId) return toast.error("Pick a school");
    if (!name.trim()) return toast.error("Campus name is required");
    if (!slugPreview) return toast.error("Slug is required");

    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_create_campus", {
        _school_id: schoolId,
        _name: name.trim(),
        _slug: slugPreview,
        _code: code.trim() || null,
        _address: address.trim() || null,
        _is_active: active,
      });
      if (error) {
        toast.error(error.message || "Failed to create campus");
        return;
      }
      toast.success(`Campus "${name.trim()}" created with slug /${slugPreview}`);
      setName("");
      setSlug("");
      setCode("");
      setAddress("");
      setActive(true);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Create New Campus
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Only platform super admins can create campuses. Each campus has its own globally-unique slug.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>School</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger><SelectValue placeholder="Pick a school" /></SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} (/{s.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campus name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North Campus" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (globally unique)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={slugify(name) || "e.g. beacon-north"}
            />
            {slugPreview && (
              <p className="text-xs text-muted-foreground">Will be saved as <span className="font-mono">{slugPreview}</span></p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Code (optional)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. NRTH" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Address (optional)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive campuses are hidden from tenants.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy}>
            <Plus className="h-4 w-4 mr-1.5" /> {busy ? "Creating…" : "Create campus"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
