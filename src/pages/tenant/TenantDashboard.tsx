import { useCallback, useMemo } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BarChart3, LogOut, UserRound, Coins, UserPlus, ClipboardList, GraduationCap, FileText, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { useUniversalPrefetch, getCachedStats } from "@/hooks/useUniversalPrefetch";
import { isEduverseRole, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import { TenantShell } from "@/components/tenant/TenantShell";
import { Button } from "@/components/ui/button";
import { DashboardHome } from "@/pages/tenant/modules/DashboardHome";
import { AdminConsole } from "@/pages/tenant/modules/AdminConsole";
import PresenceDebugModule from "@/pages/tenant/modules/PresenceDebugModule";
import { UsersModule } from "@/pages/tenant/modules/UsersModule";
import { CrmModule } from "@/pages/tenant/modules/CrmModule";
import { AcademicModule } from "@/pages/tenant/modules/AcademicModule";
import { AttendanceModule } from "@/pages/tenant/modules/AttendanceModule";
import { PlatformSchoolsModule } from "@/pages/tenant/modules/PlatformSchoolsModule";
import { ReportsModule } from "@/pages/tenant/modules/ReportsModule";
import { FinanceModule } from "@/pages/tenant/modules/FinanceModule";
import { PrincipalHome } from "@/pages/tenant/role-homes/PrincipalHome";
import { VicePrincipalHome } from "@/pages/tenant/role-homes/VicePrincipalHome";
import { SupportModule } from "@/pages/tenant/modules/SupportModule";
import { DirectoryModule } from "@/pages/tenant/modules/DirectoryModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";
import { HrLeavesModule } from "@/pages/tenant/hr-modules/HrLeavesModule";
import { HrSalariesModule } from "@/pages/tenant/hr-modules/HrSalariesModule";
import { HrContractsModule } from "@/pages/tenant/hr-modules/HrContractsModule";
import { HrReviewsModule } from "@/pages/tenant/hr-modules/HrReviewsModule";
import { HrDocumentsModule } from "@/pages/tenant/hr-modules/HrDocumentsModule";
import { MarketingLeadsModule } from "@/pages/tenant/marketing-modules/MarketingLeadsModule";
import { MarketingFollowUpsModule } from "@/pages/tenant/marketing-modules/MarketingFollowUpsModule";
import { MarketingCallsModule } from "@/pages/tenant/marketing-modules/MarketingCallsModule";
import { MarketingSourcesModule } from "@/pages/tenant/marketing-modules/MarketingSourcesModule";
import { MarketingCampaignsModule } from "@/pages/tenant/marketing-modules/MarketingCampaignsModule";
import { AccountantFeesModule } from "@/pages/tenant/accountant-modules/AccountantFeesModule";
import { AccountantInvoicesModule } from "@/pages/tenant/accountant-modules/AccountantInvoicesModule";
import { AccountantPaymentsModule } from "@/pages/tenant/accountant-modules/AccountantPaymentsModule";
import { AccountantExpensesModule } from "@/pages/tenant/accountant-modules/AccountantExpensesModule";
import { AccountantPayrollModule } from "@/pages/tenant/accountant-modules/AccountantPayrollModule";
import NoticesModule from "@/pages/tenant/modules/NoticesModule";
import HolidaysModule from "@/pages/tenant/modules/HolidaysModule";
import DiaryModule from "@/pages/tenant/modules/DiaryModule";
import ExamsModule from "@/pages/tenant/modules/ExamsModule";
import ReportCardModule from "@/pages/tenant/modules/ReportCardModule";
import PrincipalComplaintsModule from "@/pages/tenant/modules/PrincipalComplaintsModule";
import PrincipalParentNotesModule from "@/pages/tenant/modules/PrincipalParentNotesModule";
import FeesAdvancedModule from "@/pages/tenant/modules/FeesAdvancedModule";
import AdmissionsModule from "@/pages/tenant/modules/AdmissionsModule";
import FeeVouchersModule from "@/pages/tenant/modules/FeeVouchersModule";
import { RouteGuard } from "@/components/tenant/RouteGuard";
import { AICounselorMode } from "@/components/ai/AICounselorMode";

const TenantDashboard = () => {
  const { schoolSlug, role: roleParam } = useParams();
  // Support route aliases that are nicer than DB enum values.
  const roleAlias = useMemo(() => {
    if (!roleParam) return null;
    if (roleParam === "hr") return "hr_manager";
    if (roleParam === "marketing") return "marketing_staff";
    return roleParam;
  }, [roleParam]);
  const role = (isEduverseRole(roleAlias) ? roleAlias : null) as EduverseRole | null;
  
  // Use optimized tenant hook with caching
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  // Use optimized authorization hook with caching
  const authz = useAuthz({
    schoolId,
    userId: user?.id ?? null,
    role: role ?? undefined,
  });
  const authzState = authz.state;
  const authzMessage = authz.message;


  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  const title = useMemo(() => {
    if (tenant.status === "ready" && role) return `${tenant.school?.name} • ${roleLabel[role]}`;
    if (tenant.status === "ready") return tenant.school?.name || "AltRix";
    return "AltRix";
  }, [tenant.status, tenant.school, role]);

  // Calculate month start for MTD queries
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  // 7 days ago for attendance
  const d7Ago = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  // Get cached stats for offline mode
  const cachedKPIs = useMemo(() => {
    if (!schoolId) return null;
    return getCachedStats(schoolId, 'admin') as Record<string, number> | null;
  }, [schoolId]);

  // Realtime invalidation callback - only when online
  const invalidateKpiQueries = useCallback(() => {
    if (!navigator.onLine) return;
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_revenue", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_leads", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_attendance", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_students", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_invoices", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_staff", schoolId] });
  }, [queryClient, schoolId]);

  // Realtime subscriptions for KPIs - only when online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  useRealtimeTable({
    channel: `dashboard-kpi-payments-${schoolId}`,
    table: "finance_payments",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-leads-${schoolId}`,
    table: "crm_leads",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-attendance-${schoolId}`,
    table: "attendance_entries",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-students-${schoolId}`,
    table: "students",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-invoices-${schoolId}`,
    table: "finance_invoices",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-staff-${schoolId}`,
    table: "school_memberships",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId && isOnline,
    onChange: invalidateKpiQueries,
  });

  // Fetch Revenue (MTD payments)
  const { data: revenueMtd = cachedKPIs?.revenueMtd ?? 0 } = useQuery({
    queryKey: ["dashboard_kpi_revenue", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payments")
        .select("amount")
        .eq("school_id", schoolId!)
        .gte("paid_at", monthStart.toISOString())
        .limit(1000);
      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Admissions (leads count & open leads)
  const { data: leadsData } = useQuery({
    queryKey: ["dashboard_kpi_leads", schoolId],
    queryFn: async () => {
      const [totalRes, openRes] = await Promise.all([
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("school_id", schoolId!),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("school_id", schoolId!).not("stage_id", "is", null),
      ]);
      return {
        total: totalRes.count ?? 0,
        open: openRes.count ?? 0,
      };
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Attendance (7-day rate)
  const { data: attendanceData } = useQuery({
    queryKey: ["dashboard_kpi_attendance", schoolId],
    queryFn: async () => {
      const [entriesRes, presentRes] = await Promise.all([
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!)
          .gte("created_at", d7Ago.toISOString()),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!)
          .eq("status", "present")
          .gte("created_at", d7Ago.toISOString()),
      ]);
      const total = entriesRes.count ?? 0;
      const present = presentRes.count ?? 0;
      return {
        total,
        present,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Students count
  const { data: studentsCount = cachedKPIs?.totalStudents ?? 0 } = useQuery({
    queryKey: ["dashboard_kpi_students", schoolId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Pending Invoices
  const { data: pendingInvoices = cachedKPIs?.pendingInvoices ?? 0 } = useQuery({
    queryKey: ["dashboard_kpi_invoices", schoolId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("finance_invoices")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId!)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Staff count
  const { data: staffData } = useQuery({
    queryKey: ["dashboard_kpi_staff", schoolId],
    queryFn: async () => {
      const [totalRes, teachersRes] = await Promise.all([
        supabase.from("school_memberships").select("id", { count: "exact", head: true }).eq("school_id", schoolId!),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("school_id", schoolId!).eq("role", "teacher"),
      ]);
      return {
        total: totalRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
      };
    },
    enabled: !!schoolId && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  if (!role) return <Navigate to={`/${tenant.slug || ""}/auth`} replace />;

  // Don't show loading if we have cached user
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  // Use cached values for offline display
  const displayLeadsData = leadsData || { 
    total: cachedKPIs?.totalLeads ?? 0, 
    open: cachedKPIs?.openLeads ?? 0 
  };
  const displayAttendanceData = attendanceData || { 
    rate: cachedKPIs?.attendanceRate7d ?? 0 
  };
  const displayStaffData = staffData || { 
    total: cachedKPIs?.totalStaff ?? 0, 
    teachers: cachedKPIs?.totalTeachers ?? 0 
  };

  return (
    <TenantShell title={title} subtitle="Role-isolated workspace" role={role} schoolSlug={tenant.slug}>
      <div className="flex flex-col gap-6">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
            📶 Offline Mode — Showing cached data
          </div>
        )}

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Revenue KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
              {revenueMtd.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </div>

          {/* Students KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Students</p>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {studentsCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Enrolled</p>
          </div>

          {/* Staff KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Staff</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {displayStaffData.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{displayStaffData.teachers} teachers</p>
          </div>

          {/* Admissions KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Admissions</p>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {displayLeadsData.open}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{displayLeadsData.total} leads</p>
          </div>

          {/* Pending Invoices KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pending</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {pendingInvoices}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Invoices</p>
          </div>

          {/* Attendance KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Attendance</p>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {displayAttendanceData.rate}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">7-day rate</p>
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">Workspace</p>
              <p className="text-sm text-muted-foreground">You are signed in as {user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="soft"
                onClick={() => navigate(`/${tenant.slug}/auth`)}
                className="justify-start"
              >
                <UserRound className="mr-2 h-4 w-4" /> Switch role
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(`/${tenant.slug}/auth`);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>

          {authzState === "denied" && (
            <div className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">Access Denied</p>
              <p className="mt-1">{authzMessage ?? "You do not have access to this role."}</p>
              <div className="mt-3">
                <Button
                  variant="hero"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate(`/${tenant.slug}/auth`);
                  }}
                >
                  Return to login
                </Button>
              </div>
            </div>
          )}
        </div>

        {authzState !== "denied" && (
          <RouteGuard>
            <Routes>
            <Route index element={
              role === "principal" ? <PrincipalHome /> : 
              role === "vice_principal" ? <VicePrincipalHome /> : 
              <DashboardHome />
            } />
            <Route path="admin" element={<AdminConsole />} />
            <Route path="presence-debug" element={<PresenceDebugModule />} />
            <Route path="schools" element={<PlatformSchoolsModule />} />
            <Route path="messages" element={<MessagesModule schoolId={tenant.schoolId} />} />
            <Route path="users" element={<UsersModule />} />
            <Route path="directory" element={<DirectoryModule />} />
            <Route path="crm" element={<CrmModule />} />
            <Route path="academic" element={<AcademicModule />} />
            <Route path="timetable" element={<TimetableBuilderModule />} />
            <Route path="attendance" element={<AttendanceModule />} />
            <Route path="finance" element={<FinanceModule />} />
            <Route path="fees-pro" element={<FeesAdvancedModule />} />
            <Route path="fee-vouchers" element={<FeeVouchersModule />} />
            <Route path="admissions" element={<AdmissionsModule />} />
            <Route path="reports" element={<ReportsModule />} />
            <Route path="leaves" element={<HrLeavesModule />} />
            <Route path="notices" element={<NoticesModule schoolId={tenant.schoolId} canManage={true} />} />
            <Route path="holidays" element={<HolidaysModule schoolId={tenant.schoolId} canManage={["principal","vice_principal","school_admin","academic_coordinator","hr_manager","school_owner","super_admin"].includes(role || "")} />} />
            <Route path="diary" element={<DiaryModule schoolId={tenant.schoolId} canManage={["teacher","principal","vice_principal","school_admin","academic_coordinator"].includes(role || "")} />} />
            <Route path="exams" element={<ExamsModule schoolId={tenant.schoolId} canManage={["teacher","principal","vice_principal","school_admin","academic_coordinator","school_owner"].includes(role || "")} />} />
            <Route path="report-cards" element={<ReportCardModule schoolId={tenant.schoolId} canManage={["teacher","principal","vice_principal","school_admin","academic_coordinator"].includes(role || "")} />} />
            <Route path="support" element={<SupportModule schoolId={tenant.schoolId} />} />
            <Route path="complaints" element={<PrincipalComplaintsModule />} />
            <Route path="parent-notes" element={<PrincipalParentNotesModule />} />
            <Route path="counseling" element={<AICounselorMode schoolId={tenant.schoolId} />} />
            <Route path="*" element={<Navigate to={`/${tenant.slug}/${role}`} replace />} />
            </Routes>
          </RouteGuard>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantDashboard;
