import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Users,
  Calendar,
  ClipboardList,
  Coins,
  FileText,
  Star,
  WifiOff,
  UserPlus,
  Headphones,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import {
  useOfflineStaffMembers,
  useOfflineLeaveRequests,
  useOfflineContracts,
} from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import {
  DashboardHeader,
  QuickActionGrid,
  StatTile,
  SmartCard,
  SectionTitle,
} from "@/components/ui/dashboard-kit";

export function HrHomeModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(
    () => (tenant.status === "ready" ? tenant.schoolId : null),
    [tenant.status, tenant.schoolId],
  );
  const basePath = `/${schoolSlug}/hr`;

  const {
    data: staff,
    loading: staffLoading,
    isOffline,
    isUsingCache: staffFromCache,
    refresh: refreshStaff,
  } = useOfflineStaffMembers(schoolId);
  const { data: leaveRequests, isUsingCache: leavesFromCache } = useOfflineLeaveRequests(schoolId);
  const { data: contracts, isUsingCache: contractsFromCache } = useOfflineContracts(schoolId);

  const metrics = useMemo(
    () => ({
      totalStaff: staff.length,
      pendingLeaves: leaveRequests.filter((l) => l.status === "pending").length,
      activeContracts: contracts.filter((c) => c.status === "active").length,
    }),
    [staff, leaveRequests, contracts],
  );

  const loading = staffLoading;
  const isUsingCache = staffFromCache || leavesFromCache || contractsFromCache;

  const quickActions = [
    { label: "Add staff", icon: UserPlus, to: `${basePath}/users`, tone: "info" as const },
    {
      label: "Leaves",
      icon: Calendar,
      to: `${basePath}/leaves`,
      tone: "warning" as const,
      badge: metrics.pendingLeaves,
    },
    { label: "Attendance", icon: ClipboardList, to: `${basePath}/attendance` },
    { label: "Payroll", icon: Coins, to: `${basePath}/salaries`, tone: "success" as const },
    { label: "Contracts", icon: FileText, to: `${basePath}/contracts` },
    { label: "Reviews", icon: Star, to: `${basePath}/reviews`, tone: "info" as const },
    { label: "Documents", icon: FileText, to: `${basePath}/documents` },
    { label: "Support", icon: Headphones, to: `${basePath}/support` },
  ];

  if (loading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <OfflineDataBanner
        isOffline={isOffline}
        isUsingCache={isUsingCache}
        onRefresh={refreshStaff}
      />

      <DashboardHeader name="HR Workspace" role="Human Resources" subtitle="People operations" />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label="Total staff" value={metrics.totalStaff} icon={Users} tone="info" />
        <StatTile
          label="Pending leaves"
          value={metrics.pendingLeaves}
          icon={Calendar}
          tone={metrics.pendingLeaves > 0 ? "warning" : "success"}
        />
        <StatTile
          label="Active contracts"
          value={metrics.activeContracts}
          icon={FileText}
          tone="success"
        />
      </div>

      {/* Quick actions */}
      <div>
        <SectionTitle title="Quick actions" />
        <QuickActionGrid actions={quickActions} columns={{ base: 4, sm: 4, md: 4, lg: 8 }} />
      </div>

      {isOffline && staff.length === 0 && (
        <SmartCard
          title="No cached HR data"
          subtitle="Connect to the internet to load data"
          icon={WifiOff}
          tone="warning"
        />
      )}
    </div>
  );
}
