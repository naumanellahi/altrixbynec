import {
  BarChart3, BookOpen, CalendarDays, Coins, GraduationCap, Headphones,
  KanbanSquare, LayoutGrid, Megaphone, MessageSquare, NotebookPen,
  ShieldAlert, ShieldCheck, Users, FileText, PartyPopper, UserPlus,
  Briefcase, Wallet, Receipt, FileSignature, ClipboardList, Heart,
} from "lucide-react";
import type { EduverseRole } from "@/lib/eduverse-roles";

export type NavGroup =
  | "overview" | "academics" | "people" | "finance"
  | "operations" | "communication" | "admin";

export interface NavItem {
  key: string;            // dedupe key
  label: string;
  icon: any;
  group: NavGroup;
  // path segment after `/{slug}/{role}/` — empty string for dashboard root
  path: string;
  roles: EduverseRole[];  // any of these roles unlocks the item
}

/**
 * Catalog of every module the existing dashboards already expose.
 * Routing reuses the existing `/{slug}/{role}/...` URLs so all current
 * modules, permissions, and tenant logic continue to work unchanged.
 */
export const NAV_CATALOG: NavItem[] = [
  { key: "home", label: "Dashboard", icon: LayoutGrid, group: "overview", path: "",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","accountant","hr_manager","counselor","marketing_staff","parent","student"] },

  // Academics
  { key: "academic", label: "Academic", icon: GraduationCap, group: "academics", path: "academic",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher"] },
  { key: "timetable", label: "Timetable", icon: CalendarDays, group: "academics", path: "timetable",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent"] },
  { key: "attendance", label: "Attendance", icon: ClipboardList, group: "academics", path: "attendance",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent"] },
  { key: "exams", label: "Exams", icon: FileSignature, group: "academics", path: "exams",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent"] },
  { key: "report-cards", label: "Report Cards", icon: FileText, group: "academics", path: "report-cards",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent"] },
  { key: "diary", label: "Diary", icon: BookOpen, group: "academics", path: "diary",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent"] },

  // People
  { key: "users", label: "Staff", icon: Users, group: "people", path: "users",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "admissions", label: "Admissions", icon: UserPlus, group: "people", path: "admissions",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","marketing_staff"] },
  { key: "crm", label: "CRM", icon: KanbanSquare, group: "people", path: "crm",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff"] },
  { key: "parent-notes", label: "Parent Notes", icon: NotebookPen, group: "people", path: "parent-notes",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin"] },

  // Finance
  { key: "fees", label: "Fees", icon: Coins, group: "finance", path: "fees-pro",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","accountant"] },
  { key: "fee-vouchers", label: "Fee Vouchers", icon: Receipt, group: "finance", path: "fee-vouchers",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","accountant","hr_manager"] },
  { key: "finance", label: "Finance", icon: Wallet, group: "finance", path: "finance",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },

  // Operations
  { key: "notices", label: "Notices", icon: Megaphone, group: "operations", path: "notices",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent","hr_manager","marketing_staff","accountant","counselor"] },
  { key: "holidays", label: "Holidays", icon: PartyPopper, group: "operations", path: "holidays",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","student","parent","hr_manager"] },
  { key: "reports", label: "Reports", icon: BarChart3, group: "operations", path: "reports",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","hr_manager","accountant","marketing_staff"] },
  { key: "complaints", label: "Complaints", icon: ShieldAlert, group: "operations", path: "complaints",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin"] },
  // Counseling module currently only ships a counselor-facing route.
  // Hide for other roles until cross-role counseling views exist, so the
  // sidebar entry never lands on a missing page.
  { key: "counseling", label: "Counseling", icon: Heart, group: "operations", path: "counseling",
    roles: ["counselor"] },

  // Communication
  { key: "messages", label: "Messages", icon: MessageSquare, group: "communication", path: "messages",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","teacher","accountant","hr_manager","counselor","marketing_staff","parent","student"] },
  { key: "support", label: "Support", icon: Headphones, group: "communication", path: "support",
    roles: ["super_admin","school_owner","principal","vice_principal","hr_manager"] },

  // Admin
  { key: "admin", label: "Admin Console", icon: ShieldCheck, group: "admin", path: "admin",
    roles: ["super_admin"] },
  { key: "schools", label: "Schools", icon: Briefcase, group: "admin", path: "schools",
    roles: ["super_admin"] },
];

export const GROUP_LABELS: Record<NavGroup, string> = {
  overview: "Overview",
  academics: "Academics",
  people: "People",
  finance: "Finance",
  operations: "Operations",
  communication: "Communication",
  admin: "Administration",
};

export const GROUP_ORDER: NavGroup[] = [
  "overview", "academics", "people", "finance", "operations", "communication", "admin",
];

const ROLE_PRIORITY: EduverseRole[] = [
  "super_admin","school_owner","principal","vice_principal","school_admin",
  "academic_coordinator","hr_manager","accountant","marketing_staff",
  "counselor","teacher","parent","student",
];

export function pickPrimaryRole(roles: EduverseRole[]): EduverseRole | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
}

/**
 * Role inheritance mirror of `permissions.ts` so the sidebar built by
 * `buildMergedNav` exposes every module a higher-tier role implicitly
 * owns (e.g. school_owner sees everything; principal sees HR/finance/
 * academic_coordinator/counselor modules).
 */
const NAV_INHERITANCE: Partial<Record<EduverseRole, EduverseRole[]>> = {
  super_admin: [
    "school_owner","principal","vice_principal","school_admin","hr_manager",
    "accountant","academic_coordinator","teacher","marketing_staff",
    "student","parent",
  ],
  school_owner: [
    "principal","vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator","teacher","marketing_staff",
  ],
  principal: [
    "vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator",
  ],
  vice_principal: [
    "school_admin","hr_manager","accountant","academic_coordinator",
  ],
};

function expandNavRoles(roles: EduverseRole[]): EduverseRole[] {
  const out = new Set<EduverseRole>(roles);
  for (const r of roles) for (const i of NAV_INHERITANCE[r] ?? []) out.add(i);
  return Array.from(out);
}

/**
 * Merge nav items across all of the user's roles, applying role
 * inheritance so owners/principals automatically see staff modules.
 */
export function buildMergedNav(inputRoles: EduverseRole[]) {
  const roles = expandNavRoles(inputRoles);
  const set = new Set<string>();
  const items: NavItem[] = [];
  for (const item of NAV_CATALOG) {
    if (item.roles.some((r) => roles.includes(r)) && !set.has(item.key)) {
      set.add(item.key);
      items.push(item);
    }
  }
  const grouped: Record<NavGroup, NavItem[]> = {
    overview: [], academics: [], people: [], finance: [],
    operations: [], communication: [], admin: [],
  };
  for (const it of items) grouped[it.group].push(it);
  return { items, grouped };
}
