import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, AlertTriangle, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ComplaintThread } from "@/components/complaints/ComplaintThread";

interface PrincipalComplaint {
  id: string;
  flow: string;
  sender_user_id: string | null; // null for anonymous student complaints (via view)
  student_id: string | null;
  subject: string;
  content: string;
  category: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
}

export default function PrincipalComplaintsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  const [items, setItems] = useState<PrincipalComplaint[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    if (!schoolId) return;
    const { data, error } = await (supabase as any)
      .from("complaints_principal_view")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as PrincipalComplaint[];
    setItems(list);

    // Resolve student names (for teacher_to_parent flow)
    const sids = Array.from(
      new Set(list.map((c) => c.student_id).filter(Boolean) as string[])
    );
    if (sids.length) {
      const { data: stu } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", sids);
      const m: Record<string, string> = {};
      (stu ?? []).forEach((s: any) => {
        m[s.id] = `${s.first_name} ${s.last_name ?? ""}`.trim();
      });
      setStudentNames(m);
    }

    // Resolve sender names (only present for non-anonymous flow)
    const senderIds = Array.from(
      new Set(list.map((c) => c.sender_user_id).filter(Boolean) as string[])
    );
    if (senderIds.length) {
      const { data: dir } = await supabase.rpc("get_school_user_directory", {
        _school_id: schoolId,
      });
      const m: Record<string, string> = {};
      (dir ?? []).forEach((d: any) => {
        if (senderIds.includes(d.user_id))
          m[d.user_id] = d.display_name || d.email || "Member";
      });
      setSenderNames(m);
    }
  };

  useEffect(() => {
    load();
  }, [schoolId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("complaints")
      .update({
        status,
        resolution_note: drafts[id] ?? undefined,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status.replace("_", " ")}`);
    load();
  };

  const anonItems = items.filter((c) => c.flow === "student_to_principal");
  const teacherItems = items.filter((c) => c.flow === "teacher_to_parent");

  const renderCard = (c: PrincipalComplaint, anonymous: boolean) => (
    <Card key={c.id}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{c.subject}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {anonymous ? (
            <span className="flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> Anonymous student
            </span>
          ) : (
            <span>From {senderNames[c.sender_user_id ?? ""] || "Teacher"}</span>
          )}
          {c.student_id && (
            <span>About: {studentNames[c.student_id] || "Student"}</span>
          )}
          {c.category && (
            <Badge variant="outline" className="text-[10px]">
              {c.category}
            </Badge>
          )}
          <Badge
            variant={c.status === "resolved" ? "default" : "secondary"}
            className="text-[10px] capitalize"
          >
            {c.status.replace("_", " ")}
          </Badge>
          <span className="ml-auto">{format(new Date(c.created_at), "MMM d, yyyy")}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm">{c.content}</p>
        {c.resolution_note && (
          <p className="rounded bg-muted/50 p-2 text-sm">
            <strong>Resolution note:</strong> {c.resolution_note}
          </p>
        )}
        {c.status !== "resolved" && c.status !== "dismissed" && (
          <div className="space-y-2">
            <Textarea
              rows={3}
              placeholder="Add a resolution / action note (visible to the sender)…"
              value={drafts[c.id] ?? ""}
              onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => updateStatus(c.id, "in_review")}>
                Mark in review
              </Button>
              <Button size="sm" variant="default" onClick={() => updateStatus(c.id, "resolved")}>
                Mark resolved
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "dismissed")}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
        {schoolId && (
          <ComplaintThread
            complaintId={c.id}
            schoolId={schoolId}
            authorRole="principal"
            anonymousAuthors={anonymous}
            usePrincipalView={anonymous}
            nameLookup={anonymous ? {} : { ...senderNames, ...studentNames }}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Complaints</h2>
        <p className="text-sm text-muted-foreground">
          Anonymous complaints from students and named complaints filed by teachers about specific
          students.
        </p>
      </div>

      <Tabs defaultValue="anon">
        <TabsList>
          <TabsTrigger value="anon" className="gap-2">
            <Shield className="h-4 w-4" /> Anonymous from students ({anonItems.length})
          </TabsTrigger>
          <TabsTrigger value="teacher" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> From teachers ({teacherItems.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="anon" className="space-y-3 pt-4">
          {anonItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No anonymous complaints.</p>
          ) : (
            anonItems.map((c) => renderCard(c, true))
          )}
        </TabsContent>
        <TabsContent value="teacher" className="space-y-3 pt-4">
          {teacherItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher complaints.</p>
          ) : (
            teacherItems.map((c) => renderCard(c, false))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
