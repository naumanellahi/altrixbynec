import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pin, Plus, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Notice {
  id: string;
  title: string;
  body: string | null;
  audience: string;
  priority: string;
  pinned: boolean;
  publish_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface Props {
  schoolId: string | null;
  canManage?: boolean;
}

export default function NoticesModule({ schoolId, canManage = false }: Props) {
  const { user } = useSession();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "all", priority: "normal", pinned: false });

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("notices")
      .select("*")
      .eq("school_id", schoolId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load notices");
    setNotices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [schoolId]);

  const submit = async () => {
    if (!schoolId || !user) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await (supabase as any).from("notices").insert({
      school_id: schoolId,
      title: form.title,
      body: form.body || null,
      audience: form.audience,
      priority: form.priority,
      pinned: form.pinned,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Notice posted");
    setForm({ title: "", body: "", audience: "all", priority: "normal", pinned: false });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("notices").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const togglePin = async (n: Notice) => {
    const { error } = await (supabase as any).from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const priorityColor = (p: string) =>
    p === "urgent" ? "destructive" : p === "high" ? "default" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Notices</h2>
          <p className="text-sm text-muted-foreground">School-wide announcements</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New notice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post a notice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Notice body..." rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="parents">Parents</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                  Pin to top
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Post</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : notices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Megaphone className="mx-auto h-10 w-10 opacity-50" />
          <p className="mt-3">No notices yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className={n.pinned ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {n.pinned && <Pin className="h-4 w-4 text-primary" />}
                      {n.title}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={priorityColor(n.priority) as any} className="text-[10px]">{n.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{n.audience}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => togglePin(n)}><Pin className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(n.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {n.body && <CardContent className="pt-0"><p className="text-sm whitespace-pre-wrap">{n.body}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
