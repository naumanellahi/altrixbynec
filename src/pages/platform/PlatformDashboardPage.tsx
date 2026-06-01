import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Building2,
  Users2,
  GraduationCap,
  Megaphone,
  CalendarCheck,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { usePlatformSuperAdmin } from "@/hooks/usePlatformSuperAdmin";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

const KPI_META: { key: keyof Kpis; label: string; icon: any; tone: string; sub: string }[] = [
  { key: "schools", label: "Schools", icon: Building2, tone: "from-amber-400/20 to-amber-400/0 text-amber-200", sub: "Active tenants on the platform" },
  { key: "students", label: "Students", icon: GraduationCap, tone: "from-sky-400/20 to-sky-400/0 text-sky-200", sub: "Live enrolment across all schools" },
  { key: "leads", label: "CRM Leads", icon: Megaphone, tone: "from-fuchsia-400/20 to-fuchsia-400/0 text-fuchsia-200", sub: "Pipeline volume, all tenants" },
  { key: "sessions", label: "Attendance Sessions", icon: CalendarCheck, tone: "from-emerald-400/20 to-emerald-400/0 text-emerald-200", sub: "Total sessions recorded" },
];

type Kpis = { schools: number; students: number; leads: number; sessions: number };

export default function PlatformDashboardPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const authz = usePlatformSuperAdmin(user?.id);

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string>("__none__");
  const [kpis, setKpis] = useState<Kpis>({ schools: 0, students: 0, leads: 0, sessions: 0 });
  const [busy, setBusy] = useState(false);

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === activeSchoolId) ?? null,
    [schools, activeSchoolId],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const refresh = async () => {
    if (!user || !authz.allowed) return;
    setBusy(true);
    try {
      const [{ data: schoolsData }, schoolsCount, studentsCount, leadsCount, sessionsCount] = await Promise.all([
        supabase.from("schools").select("id,slug,name,is_active,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }),
        supabase.from("attendance_sessions").select("id", { count: "exact", head: true }),
      ]);
      setSchools((schoolsData ?? []) as SchoolRow[]);
      setKpis({
        schools: schoolsCount.count ?? 0,
        students: studentsCount.count ?? 0,
        leads: leadsCount.count ?? 0,
        sessions: sessionsCount.count ?? 0,
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (authz.loading) return;
    if (!authz.allowed) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authz.loading, authz.allowed]);

  useEffect(() => {
    if (activeSchoolId !== "__none__") return;
    if (schools.length === 0) return;
    setActiveSchoolId(schools[0].id);
  }, [schools, activeSchoolId]);

  if (loading) return null;
  if (!authz.loading && !authz.allowed) return <Navigate to="/auth" replace />;

  return (
    <SuperAdminShell
      title="Overview"
      subtitle="Platform-wide performance, schools and operations"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={busy}
          className="bg-white/[0.04] border-slate-700/50 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 mb-6 border"
        style={{
          background:
            "linear-gradient(135deg, hsl(230 60% 16% / 0.9), hsl(265 60% 18% / 0.85))",
          borderColor: "hsl(45 50% 50% / 0.25)",
        }}
      >
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(45 95% 55%), transparent 70%)" }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300/90 text-[11px] uppercase tracking-[0.22em] font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Welcome back, Master Admin
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              {user?.email?.split("@")[0]} · Full Platform Control
            </h2>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
              You have unrestricted access to every school, owner and module. Use the sidebar to jump
              into any operational area, or pick a tenant below to enter its workspace directly.
            </p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {KPI_META.map((meta) => {
          const Icon = meta.icon;
          return (
            <div
              key={meta.key}
              className="relative overflow-hidden rounded-xl p-5 border"
              style={{
                background: "hsl(230 35% 10% / 0.7)",
                borderColor: "hsl(230 30% 22%)",
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.tone} opacity-50 pointer-events-none`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    {meta.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-100 mt-2 tabular-nums">
                    {kpis[meta.key].toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{meta.sub}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* School switcher + quick jump */}
      <div
        className="rounded-xl border p-5 md:p-6"
        style={{ background: "hsl(230 35% 10% / 0.6)", borderColor: "hsl(230 30% 22%)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100">School Switcher</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jump directly into any tenant module with full owner-level access.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/super_admin/schools")}
            className="bg-white/[0.04] border-slate-700/50 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <Building2 className="h-4 w-4 mr-2" /> Manage all
          </Button>
        </div>

        <Select value={activeSchoolId} onValueChange={setActiveSchoolId}>
          <SelectTrigger className="bg-white/[0.04] border-slate-700/50 text-slate-200">
            <SelectValue placeholder="Select a school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.slug} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
          {[
            { label: "Workspace", path: "super_admin", icon: ArrowUpRight, hero: true },
            { label: "Academic", path: "super_admin/academic", icon: GraduationCap },
            { label: "CRM / Admissions", path: "super_admin/crm", icon: Megaphone },
            { label: "Users & Roles", path: "super_admin/users", icon: Users2 },
            { label: "Attendance", path: "super_admin/attendance", icon: CalendarCheck },
            { label: "HR", path: "super_admin/hr", icon: Users2 },
            { label: "Finance", path: "super_admin/finance", icon: ExternalLink },
            { label: "Bootstrap", path: "bootstrap", icon: Sparkles },
          ].map((q) => (
            <Button
              key={q.path}
              variant={q.hero ? "default" : "outline"}
              size="sm"
              disabled={!activeSchool}
              onClick={() => activeSchool && navigate(`/${activeSchool.slug}/${q.path}`)}
              className={
                q.hero
                  ? "justify-start bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold"
                  : "justify-start bg-white/[0.04] border-slate-700/50 text-slate-200 hover:bg-white/10 hover:text-white"
              }
            >
              <q.icon className="h-4 w-4 mr-2" />
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Recent schools */}
      <div
        className="rounded-xl border mt-6 overflow-hidden"
        style={{ background: "hsl(230 35% 10% / 0.6)", borderColor: "hsl(230 30% 22%)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "hsl(230 30% 22%)" }}>
          <h3 className="text-base font-bold text-slate-100">Recent Schools</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest tenant signups on the platform</p>
        </div>
        <div className="divide-y" style={{ borderColor: "hsl(230 30% 18%)" }}>
          {schools.slice(0, 6).map((s) => (
            <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-slate-900 shrink-0"
                  style={{ background: "hsl(45 90% 60%)" }}
                >
                  {s.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100 text-sm truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    /{s.slug} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                    s.is_active
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-rose-400/15 text-rose-300"
                  }`}
                >
                  {s.is_active ? "Active" : "Disabled"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-300 hover:text-amber-300 hover:bg-amber-400/10"
                  onClick={() => navigate(`/${s.slug}/super_admin`)}
                >
                  Enter <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ))}
          {schools.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No schools yet.</p>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
