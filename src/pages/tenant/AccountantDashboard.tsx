import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { AccountantShell } from "@/components/tenant/AccountantShell";
import { AccountantHomeModule } from "@/pages/tenant/accountant-modules/AccountantHomeModule";
import { AccountantInvoicesModule } from "@/pages/tenant/accountant-modules/AccountantInvoicesModule";
import { AccountantPaymentsModule } from "@/pages/tenant/accountant-modules/AccountantPaymentsModule";
import { AccountantExpensesModule } from "@/pages/tenant/accountant-modules/AccountantExpensesModule";
import { AccountantPayrollModule } from "@/pages/tenant/accountant-modules/AccountantPayrollModule";
import { AccountantReportsModule } from "@/pages/tenant/accountant-modules/AccountantReportsModule";
import { AccountantMessagesModule } from "@/pages/tenant/accountant-modules/AccountantMessagesModule";
import FeesUnifiedModule from "@/pages/tenant/modules/FeesUnifiedModule";
import { RouteGuard } from "@/components/tenant/RouteGuard";
import { ModuleErrorBoundary } from "@/components/tenant/ModuleErrorBoundary";
import { useFinanceRealtime } from "@/hooks/useFinanceRealtime";

const AccountantDashboard = () => {
  const { schoolSlug } = useParams();
  
  // Use optimized hooks with caching
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  // Use optimized authorization hook
  const authz = useAuthz({
    schoolId,
    userId: user?.id ?? null,
    requiredRoles: ["accountant"],
  });
  const authzState = authz.state;

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  // Keep every finance tab in realtime sync
  useFinanceRealtime(schoolId);

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

  if (authzState === "denied") {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="font-display text-xl font-semibold tracking-tight">Access Denied</p>
          <p className="mt-2 text-sm text-muted-foreground">You do not have Accountant access.</p>
        </div>
      </div>
    );
  }

  return (
    <AccountantShell title={`${tenant.school?.name || "EDUVERSE"} • Finance`} subtitle="Accounting & Finance" schoolSlug={tenant.slug}>
      <RouteGuard extraAllowedPaths={[
        "fees","invoices","payments","expenses","payroll","reports","messages",
        "fees-pro","fee-vouchers",
      ]}>
      <Routes>
        <Route index element={<ModuleErrorBoundary name="Dashboard"><AccountantHomeModule /></ModuleErrorBoundary>} />
        <Route path="fees" element={<ModuleErrorBoundary name="Fee Plans"><AccountantFeesModule /></ModuleErrorBoundary>} />
        <Route path="fees-pro" element={<ModuleErrorBoundary name="Fees (Advanced)"><FeesAdvancedModule /></ModuleErrorBoundary>} />
        <Route path="fee-vouchers" element={<ModuleErrorBoundary name="Fee Vouchers"><FeeVouchersModule /></ModuleErrorBoundary>} />
        <Route path="invoices" element={<ModuleErrorBoundary name="Invoices"><AccountantInvoicesModule /></ModuleErrorBoundary>} />
        <Route path="payments" element={<ModuleErrorBoundary name="Payments"><AccountantPaymentsModule /></ModuleErrorBoundary>} />
        <Route path="expenses" element={<ModuleErrorBoundary name="Expenses"><AccountantExpensesModule /></ModuleErrorBoundary>} />
        <Route path="payroll" element={<ModuleErrorBoundary name="Payroll"><AccountantPayrollModule /></ModuleErrorBoundary>} />
        <Route path="reports" element={<ModuleErrorBoundary name="Reports"><AccountantReportsModule /></ModuleErrorBoundary>} />
        <Route path="messages" element={<ModuleErrorBoundary name="Messages"><AccountantMessagesModule /></ModuleErrorBoundary>} />
        <Route path="*" element={<Navigate to={`/${tenant.slug}/accountant`} replace />} />
      </Routes>
      </RouteGuard>
    </AccountantShell>
  );
};

export default AccountantDashboard;
