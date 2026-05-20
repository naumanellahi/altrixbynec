/**
 * Centralized PermissionResolver
 * ------------------------------------------------------------------
 * Single source of truth that maps a user's roles → permission bundle:
 *   - visibleModules: NavItems the user can see in the sidebar
 *   - allowedPaths:   path segments the user is allowed to navigate to
 *   - widgets:        per-widget visibility flags for dashboards
 *   - actions:        granular action flags (create/edit/delete capabilities)
 *
 * Both the sidebar (TenantShell) and the route guard (RouteGuard)
 * consult this resolver so UI visibility and URL access stay in sync.
 */
import { useMemo } from "react";
import type { EduverseRole } from "@/lib/eduverse-roles";
import { NAV_CATALOG, type NavItem } from "@/lib/role-navigation";
import { useSession } from "@/hooks/useSession";
import { useUserRole } from "@/hooks/useUserRole";

export interface PermissionBundle {
  roles: EduverseRole[];
  loading: boolean;
  visibleModules: NavItem[];
  allowedPaths: Set<string>;          // "" for dashboard root, otherwise path segment
  canAccess: (path: string) => boolean;
  actions: {
    canManageStaff: boolean;
    canManageStudents: boolean;
    canManageFinance: boolean;
    canManageAcademics: boolean;
    canWorkCrm: boolean;
    canModerateComplaints: boolean;
    canBroadcastNotices: boolean;
  };
  widgets: {
    showFinanceKpis: boolean;
    showAdmissionsKpis: boolean;
    showAttendanceKpis: boolean;
    showStaffKpis: boolean;
    showTeacherPresence: boolean;
    showAlertsPanel: boolean;
  };
}

const STAFF_GOV: EduverseRole[] = [
  "super_admin","school_owner","principal","vice_principal","school_admin","hr_manager",
];
const ACADEMIC_GOV: EduverseRole[] = [
  "super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator",
];
const FINANCE_GOV: EduverseRole[] = [
  "super_admin","school_owner","principal","vice_principal","accountant",
];

const anyOf = (a: EduverseRole[], roles: EduverseRole[]) => a.some((r) => roles.includes(r));

/**
 * Role inheritance map. Higher-tier roles automatically inherit the
 * permissions of every lower-tier role listed below.
 *   - super_admin / school_owner → every role in the system
 *   - principal                  → vice_principal + admin + hr + accountant
 *                                  + academic_coordinator + counselor
 *   - vice_principal             → admin + hr + accountant
 *                                  + academic_coordinator + counselor
 */
const ROLE_INHERITANCE: Partial<Record<EduverseRole, EduverseRole[]>> = {
  super_admin: [
    "school_owner","principal","vice_principal","school_admin","hr_manager",
    "accountant","academic_coordinator","counselor","teacher","marketing_staff",
    "student","parent",
  ],
  school_owner: [
    "principal","vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator","counselor","teacher","marketing_staff",
  ],
  principal: [
    "vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator","counselor",
  ],
  vice_principal: [
    "school_admin","hr_manager","accountant","academic_coordinator","counselor",
  ],
};

function expandRoles(roles: EduverseRole[]): EduverseRole[] {
  const out = new Set<EduverseRole>(roles);
  for (const r of roles) {
    for (const inherited of ROLE_INHERITANCE[r] ?? []) out.add(inherited);
  }
  return Array.from(out);
}

/**
 * Static resolver (no hook) — usable in non-React contexts.
 */
export function resolvePermissions(inputRoles: EduverseRole[]): PermissionBundle {
  const roles = expandRoles(inputRoles);
  const visibleModules = NAV_CATALOG.filter((m) => m.roles.some((r) => roles.includes(r)));

  // The path segment after `/{slug}/{role}/`. "" = dashboard root.
  const allowedPaths = new Set<string>(visibleModules.map((m) => m.path));
  // Always allow root navigation.
  allowedPaths.add("");

  // A few internal sub-paths that aren't listed in the catalog but are
  // legitimate destinations from within allowed modules.
  // Add them so deep links from inside modules don't get blocked.
  const INTRA_MODULE = [
    "directory",        // directory sub-view
    "presence-debug",   // dev-only
  ];
  for (const p of INTRA_MODULE) allowedPaths.add(p);

  const canAccess = (raw: string) => {
    // Normalize: strip leading slash, query, and pick first segment only.
    const first = (raw || "").replace(/^\/+/, "").split(/[/?#]/)[0];
    return allowedPaths.has(first);
  };

  return {
    roles,
    loading: false,
    visibleModules,
    allowedPaths,
    canAccess,
    actions: {
      canManageStaff:       anyOf(STAFF_GOV, roles),
      canManageStudents:    anyOf(ACADEMIC_GOV, roles) || roles.includes("teacher"),
      canManageFinance:     anyOf(FINANCE_GOV, roles),
      canManageAcademics:   anyOf(ACADEMIC_GOV, roles),
      canWorkCrm:           anyOf([...ACADEMIC_GOV, "marketing_staff"], roles),
      canModerateComplaints:anyOf(["super_admin","school_owner","principal","vice_principal","school_admin"], roles),
      canBroadcastNotices:  anyOf(["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","hr_manager"], roles),
    },
    widgets: {
      showFinanceKpis:    anyOf(FINANCE_GOV, roles),
      showAdmissionsKpis: anyOf([...ACADEMIC_GOV, "marketing_staff"], roles),
      showAttendanceKpis: anyOf([...ACADEMIC_GOV, "teacher"], roles),
      showStaffKpis:      anyOf(STAFF_GOV, roles),
      showTeacherPresence:anyOf(["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator"], roles),
      showAlertsPanel:    anyOf(["super_admin","school_owner","principal","vice_principal","school_admin"], roles),
    },
  };
}

/**
 * React hook — pulls the active user's roles from `user_roles`
 * (scoped to the current tenant) and returns the resolved bundle.
 */
export function usePermissions(schoolId: string | null): PermissionBundle {
  const { user } = useSession();
  const { roles, loading } = useUserRole(schoolId, user?.id ?? null);

  return useMemo(() => {
    const bundle = resolvePermissions(roles);
    return { ...bundle, loading };
  }, [roles, loading]);
}
