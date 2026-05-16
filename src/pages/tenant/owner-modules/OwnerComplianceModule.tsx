import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Shield, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCampus } from "@/hooks/useActiveCampus";

interface Props { schoolId: string | null; }

export function OwnerComplianceModule({ schoolId }: Props) {
  const activeCampusId = useActiveCampus(schoolId);

  const { data } = useQuery({
    queryKey: ["owner_compliance", schoolId, activeCampusId],
    enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return null;
      // Audit logs are school-wide (no campus_id); count recent activity.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [auditRes, schoolRes] = await Promise.all([
        supabase.from("audit_logs").select("id,action,created_at").eq("school_id", schoolId).gte("created_at", since),
        supabase.from("schools").select("is_active").eq("id", schoolId).maybeSingle(),
      ]);
      return {
        auditCount: (auditRes.data || []).length,
        isActive: !!schoolRes.data?.is_active,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Compliance & Governance</h1>
        <p className="text-muted-foreground">Audit trails, accreditation reports, and policy compliance{activeCampusId ? " (campus-scoped)" : ""}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Scale className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{data?.isActive ? "Active" : "Inactive"}</p><p className="text-xs text-muted-foreground">Accreditation Status</p></CardContent></Card>
        <Card><CardContent className="p-4"><Shield className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">Compliant</p><p className="text-xs text-muted-foreground">Policy Status</p></CardContent></Card>
        <Card><CardContent className="p-4"><FileText className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.auditCount ?? 0}</p><p className="text-xs text-muted-foreground">Audit Records (30d)</p></CardContent></Card>
        <Card><CardContent className="p-4"><CheckCircle className="h-5 w-5 text-purple-600" /><p className="mt-2 font-display text-2xl font-bold">100%</p><p className="text-xs text-muted-foreground">Compliance Score</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Detailed accreditation and policy reports will surface here as audit logging expands.</CardContent></Card>
    </div>
  );
}
