import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { OwnerShell } from "@/components/tenant/OwnerShell";

// Import all owner modules
import { OwnerOverviewModule } from "@/pages/tenant/owner-modules/OwnerOverviewModule";
import { OwnerAcademicsModule } from "@/pages/tenant/owner-modules/OwnerAcademicsModule";
import { OwnerAdmissionsModule } from "@/pages/tenant/owner-modules/OwnerAdmissionsModule";
import { OwnerFinanceModule } from "@/pages/tenant/owner-modules/OwnerFinanceModule";
import { OwnerHrModule } from "@/pages/tenant/owner-modules/OwnerHrModule";
import { OwnerWellbeingModule } from "@/pages/tenant/owner-modules/OwnerWellbeingModule";
import { OwnerComplianceModule } from "@/pages/tenant/owner-modules/OwnerComplianceModule";
import { OwnerCampusesModule } from "@/pages/tenant/owner-modules/OwnerCampusesModule";
import { OwnerBrandModule } from "@/pages/tenant/owner-modules/OwnerBrandModule";
import { OwnerSecurityModule } from "@/pages/tenant/owner-modules/OwnerSecurityModule";
import { OwnerSupportModule } from "@/pages/tenant/owner-modules/OwnerSupportModule";
import { OwnerAdvisorModule } from "@/pages/tenant/owner-modules/OwnerAdvisorModule";
import { OwnerAIModule } from "@/pages/tenant/owner-modules/OwnerAIModule";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";
import { RouteGuard } from "@/components/tenant/RouteGuard";
import { UsersModule } from "@/pages/tenant/modules/UsersModule";
import { CrmModule } from "@/pages/tenant/modules/CrmModule";
import { AcademicModule } from "@/pages/tenant/modules/AcademicModule";
import { AttendanceModule } from "@/pages/tenant/modules/AttendanceModule";
import { ReportsModule } from "@/pages/tenant/modules/ReportsModule";
import { FinanceModule } from "@/pages/tenant/modules/FinanceModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";
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
import FeeVouchersModule from "@/pages/tenant/modules/FeeVouchersModule";
import { AICounselorMode } from "@/components/ai/AICounselorMode";

// Cache key for owner auth
const OWNER_AUTHZ_CACHE = "eduverse_owner_authz_cache_strict_v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedOwnerAuthz {
  schoolId: string;
  userId: string;
  authorized: boolean;
  timestamp: number;
}

function getCachedOwnerAuthz(schoolId: string, userId: string): boolean | null {
  try {
    const cached = localStorage.getItem(OWNER_AUTHZ_CACHE);
    if (!cached) return null;
    const data: CachedOwnerAuthz = JSON.parse(cached);
    if (
      data.schoolId === schoolId &&
      data.userId === userId &&
      Date.now() - data.timestamp < CACHE_DURATION
    ) {
      return data.authorized;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedOwnerAuthz(schoolId: string, userId: string, authorized: boolean) {
  try {
    const data: CachedOwnerAuthz = { schoolId, userId, authorized, timestamp: Date.now() };
    localStorage.setItem(OWNER_AUTHZ_CACHE, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export default function OwnerDashboard() {
  const { schoolSlug } = useParams();
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();

  const schoolId = useMemo(
    () => (tenant.status === "ready" ? tenant.schoolId : null),
    [tenant.status, tenant.schoolId]
  );

  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tenant.status === "ready") return `${tenant.school.name} • Owner`;
    return "AltRix • Owner";
  }, [tenant.status, tenant.school]);

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  useEffect(() => {
    if (tenant.status !== "ready") return;
    if (!user) return;

    const schoolIdVal = tenant.schoolId;
    const userId = user.id;

    // Check cache first
    const cachedAuth = getCachedOwnerAuthz(schoolIdVal, userId);
    
    // If offline and we have cache, use it immediately
    if (!navigator.onLine && cachedAuth !== null) {
      setAuthzState(cachedAuth ? "ok" : "denied");
      if (!cachedAuth) {
        setAuthzMessage("You do not have the School Owner role for this institution.");
      }
      return;
    }

    // If we have valid cache, use it while we verify in background
    if (cachedAuth === true) {
      setAuthzState("ok");
      if (!navigator.onLine) return;
    } else {
      setAuthzState("checking");
    }

    // Skip network check if offline
    if (!navigator.onLine) {
      if (cachedAuth !== null) {
        setAuthzState(cachedAuth ? "ok" : "denied");
      }
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: ownedSchools, error: ownerErr } = await (supabase as any).rpc("owner_schools_strict");

      if (cancelled) return;
      if (ownerErr) {
        setAuthzState("denied");
        setAuthzMessage(ownerErr.message);
        setCachedOwnerAuthz(schoolIdVal, userId, false);
        return;
      }

      const ownsCurrentSchool = Array.isArray(ownedSchools) && ownedSchools.some((school: any) => school.id === schoolIdVal);
      if (!ownsCurrentSchool) {
        setAuthzState("denied");
        setAuthzMessage("You do not have the School Owner role for this institution.");
        setCachedOwnerAuthz(schoolIdVal, userId, false);
        return;
      }

      setAuthzState("ok");
      setCachedOwnerAuthz(schoolIdVal, userId, true);
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant.status, tenant.schoolId, user]);

  // Don't show loading if we have cached user
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading executive dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  if (authzState === "denied") {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="max-w-md rounded-3xl bg-surface p-8 shadow-elevated text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">{authzMessage}</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = `/${tenant.slug}/auth`;
            }}
            className="mt-6 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <OwnerShell title={title} subtitle="Executive Command Center" schoolSlug={tenant.slug}>
      {authzState === "checking" && !getCachedOwnerAuthz(schoolId || "", user?.id || "") ? (
        <div className="rounded-3xl bg-surface p-8 shadow-elevated text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Verifying executive access…</p>
        </div>
      ) : (
        <RouteGuard extraAllowedPaths={[
          "academics","admissions","finance","hr","wellbeing","compliance",
          "campuses","brand","security","support","advisor","ai","messages",
        ]}>
        <Routes>
          <Route index element={<OwnerOverviewModule schoolId={schoolId} />} />
          <Route path="academics" element={<OwnerAcademicsModule schoolId={schoolId} />} />
          <Route path="academic" element={<AcademicModule />} />
          <Route path="timetable" element={<TimetableBuilderModule />} />
          <Route path="attendance" element={<AttendanceModule />} />
          <Route path="exams" element={<ExamsModule schoolId={schoolId} canManage />} />
          <Route path="report-cards" element={<ReportCardModule schoolId={schoolId} canManage />} />
          <Route path="diary" element={<DiaryModule schoolId={schoolId} canManage />} />
          <Route path="admissions" element={<OwnerAdmissionsModule schoolId={schoolId} />} />
          <Route path="users" element={<UsersModule />} />
          <Route path="leaves" element={<HrLeavesModule />} />
          <Route path="salaries" element={<HrSalariesModule />} />
          <Route path="contracts" element={<HrContractsModule />} />
          <Route path="reviews" element={<HrReviewsModule />} />
          <Route path="documents" element={<HrDocumentsModule />} />
          <Route path="crm" element={<CrmModule />} />
          <Route path="leads" element={<MarketingLeadsModule />} />
          <Route path="follow-ups" element={<MarketingFollowUpsModule />} />
          <Route path="calls" element={<MarketingCallsModule />} />
          <Route path="sources" element={<MarketingSourcesModule />} />
          <Route path="campaigns" element={<MarketingCampaignsModule />} />
          <Route path="parent-notes" element={<PrincipalParentNotesModule />} />
          <Route path="finance" element={<OwnerFinanceModule schoolId={schoolId} />} />
          <Route path="fees" element={<AccountantFeesModule />} />
          <Route path="invoices" element={<AccountantInvoicesModule />} />
          <Route path="payments" element={<AccountantPaymentsModule />} />
          <Route path="expenses" element={<AccountantExpensesModule />} />
          <Route path="payroll" element={<AccountantPayrollModule />} />
          <Route path="fees-pro" element={<FeesAdvancedModule />} />
          <Route path="fee-vouchers" element={<FeeVouchersModule />} />
          <Route path="hr" element={<OwnerHrModule schoolId={schoolId} />} />
          <Route path="wellbeing" element={<OwnerWellbeingModule schoolId={schoolId} />} />
          <Route path="compliance" element={<OwnerComplianceModule schoolId={schoolId} />} />
          <Route path="campuses" element={<OwnerCampusesModule schoolId={schoolId} />} />
          <Route path="brand" element={<OwnerBrandModule schoolId={schoolId} />} />
          <Route path="security" element={<OwnerSecurityModule schoolId={schoolId} />} />
          <Route path="support" element={<OwnerSupportModule schoolId={schoolId} />} />
          <Route path="advisor" element={<OwnerAdvisorModule schoolId={schoolId} />} />
          <Route path="ai" element={<OwnerAIModule schoolId={schoolId} />} />
          <Route path="messages" element={<MessagesModule schoolId={schoolId} />} />
          <Route path="notices" element={<NoticesModule schoolId={schoolId} canManage />} />
          <Route path="holidays" element={<HolidaysModule schoolId={schoolId} canManage />} />
          <Route path="reports" element={<ReportsModule />} />
          <Route path="complaints" element={<PrincipalComplaintsModule />} />
          <Route path="counseling" element={<AICounselorMode schoolId={schoolId} />} />
        </Routes>
        </RouteGuard>
      )}
    </OwnerShell>
  );
}
