import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Briefcase, TrendingUp, Download, UserMinus, UserPlus, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format, subMonths } from "date-fns";

export function HrAnalyticsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const [data, setData] = useState<any>({
    headcount: 0, activeStaff: 0, newHires: 0, exits: 0,
    leavePending: 0, leaveApproved: 0, openPositions: 0,
    payrollYTD: 0, byRole: [], hireTrend: [], salaryTrend: [], leaveByType: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);

    const sinceISO = subMonths(new Date(), 6).toISOString();
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const [roles, leaves, postings, payroll, onb, offb] = await Promise.all([
      (supabase as any).from("user_roles").select("user_id, role").eq("school_id", schoolId),
      (supabase as any).from("hr_leave_applications").select("id, status, leave_type_id, created_at").eq("school_id", schoolId).gte("created_at", sinceISO),
      (supabase as any).from("hr_job_postings").select("status, openings").eq("school_id", schoolId),
      (supabase as any).from("hr_payroll_runs").select("period_year, period_month, total_net, status").eq("school_id", schoolId).gte("period_year", new Date().getFullYear()),
      (supabase as any).from("hr_onboarding_assignments").select("created_at, kind").eq("school_id", schoolId).eq("kind", "onboarding").gte("created_at", sinceISO),
      (supabase as any).from("hr_onboarding_assignments").select("created_at, kind").eq("school_id", schoolId).eq("kind", "offboarding").gte("created_at", sinceISO),
    ]);

    const rolesData = roles.data || [];
    const headcount = new Set(rolesData.map((r: any) => r.user_id)).size;
    const byRoleMap = new Map<string, number>();
    for (const r of rolesData) byRoleMap.set(r.role, (byRoleMap.get(r.role) || 0) + 1);
    const byRole = Array.from(byRoleMap.entries()).map(([role, count]) => ({ role: role.replace("_", " "), count }));

    const leaveData = leaves.data || [];
    const leavePending = leaveData.filter((l: any) => l.status === "pending").length;
    const leaveApproved = leaveData.filter((l: any) => l.status === "approved").length;

    const postingData = postings.data || [];
    const openPositions = postingData.filter((p: any) => p.status === "open").reduce((s: number, p: any) => s + p.openings, 0);

    const payrollData = payroll.data || [];
    const payrollYTD = payrollData.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.total_net || 0), 0);

    const salaryTrend = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const y = d.getFullYear(); const m = d.getMonth() + 1;
      const row = payrollData.find((p: any) => p.period_year === y && p.period_month === m);
      return { month: format(d, "MMM"), net: row ? Number(row.total_net) : 0 };
    });

    const hireTrendMap = new Map<string, { hires: number; exits: number }>();
    for (let i = 5; i >= 0; i--) {
      const k = format(subMonths(new Date(), i), "MMM");
      hireTrendMap.set(k, { hires: 0, exits: 0 });
    }
    for (const r of onb.data || []) {
      const k = format(new Date(r.created_at), "MMM");
      const v = hireTrendMap.get(k); if (v) v.hires += 1;
    }
    for (const r of offb.data || []) {
      const k = format(new Date(r.created_at), "MMM");
      const v = hireTrendMap.get(k); if (v) v.exits += 1;
    }
    const hireTrend = Array.from(hireTrendMap.entries()).map(([month, v]) => ({ month, ...v }));

    setData({
      headcount, activeStaff: headcount,
      newHires: (onb.data || []).length,
      exits: (offb.data || []).length,
      leavePending, leaveApproved, openPositions, payrollYTD,
      byRole, hireTrend, salaryTrend,
    });
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Headcount", data.headcount],
      ["New hires (6mo)", data.newHires],
      ["Exits (6mo)", data.exits],
      ["Open positions", data.openPositions],
      ["Pending leaves", data.leavePending],
      ["Approved leaves", data.leaveApproved],
      ["Payroll YTD (net)", data.payrollYTD],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hr-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))", "hsl(var(--destructive))"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-display text-2xl font-semibold">HR Analytics</h2>
          <p className="text-sm text-muted-foreground">Live workforce metrics across the school.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Headcount" value={data.headcount} icon={Users} />
        <KPI label="New hires (6mo)" value={data.newHires} icon={UserPlus} tone="success" />
        <KPI label="Exits (6mo)" value={data.exits} icon={UserMinus} tone="warning" />
        <KPI label="Open positions" value={data.openPositions} icon={Briefcase} />
        <KPI label="Pending leaves" value={data.leavePending} icon={TrendingUp} />
        <KPI label="Approved leaves" value={data.leaveApproved} icon={TrendingUp} tone="success" />
        <KPI label="Payroll net YTD" value={Number(data.payrollYTD).toLocaleString()} icon={DollarSign} tone="success" />
        <KPI label="Turnover ratio" value={data.headcount ? `${Math.round((data.exits / data.headcount) * 100)}%` : "0%"} icon={BarChart3} />
      </div>

      <Tabs defaultValue="headcount">
        <TabsList>
          <TabsTrigger value="headcount">Headcount by Role</TabsTrigger>
          <TabsTrigger value="movement">Hires vs Exits</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="headcount">
          <Card><CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byRole}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="role" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={90} label>
                      {data.byRole.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="movement">
          <Card><CardContent className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hireTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis allowDecimals={false} />
                <Tooltip /><Legend />
                <Bar dataKey="hires" fill="hsl(var(--primary))" name="Hires" />
                <Bar dataKey="exits" fill="hsl(var(--destructive))" name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card><CardContent className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salaryTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} name="Net Payroll" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {loading && <p className="text-xs text-muted-foreground">Refreshing…</p>}
    </div>
  );
}

function KPI({ label, value, icon: Icon, tone }: any) {
  const color = tone === "success" ? "text-emerald-600 bg-emerald-500/10" :
                tone === "warning" ? "text-amber-600 bg-amber-500/10" : "text-primary bg-primary/10";
  return (
    <Card><CardContent className="p-4 flex justify-between items-center">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold mt-1">{value}</p></div>
      <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
    </CardContent></Card>
  );
}
