import {
  BarChart3, BookOpen, CalendarDays, Coins, CreditCard, DollarSign, GraduationCap, Headphones,
  KanbanSquare, LayoutGrid, Megaphone, MessageSquare, NotebookPen,
  ShieldAlert, ShieldCheck, Users, FileText, PartyPopper, UserPlus,
  Briefcase, Wallet, Receipt, FileSignature, ClipboardList, Heart, PhoneCall, Target,
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
  { key: "leaves", label: "Leaves", icon: FileSignature, group: "people", path: "leaves",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "salaries", label: "Salaries", icon: Wallet, group: "people", path: "salaries",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "contracts", label: "Contracts", icon: FileSignature, group: "people", path: "contracts",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "reviews", label: "Performance Reviews", icon: ShieldCheck, group: "people", path: "reviews",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "documents", label: "Documents", icon: Briefcase, group: "people", path: "documents",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","hr_manager"] },
  { key: "admissions", label: "Admissions", icon: UserPlus, group: "people", path: "admissions",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","marketing_staff"] },
  { key: "crm", label: "CRM", icon: KanbanSquare, group: "people", path: "crm",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff"] },
  { key: "leads", label: "Leads", icon: Users, group: "people", path: "leads",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff","counselor"] },
  { key: "follow-ups", label: "Follow-ups", icon: ClipboardList, group: "people", path: "follow-ups",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff","counselor"] },
  { key: "calls", label: "Call Logs", icon: PhoneCall, group: "people", path: "calls",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff","counselor"] },
  { key: "sources", label: "Lead Sources", icon: Target, group: "people", path: "sources",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff","counselor"] },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, group: "people", path: "campaigns",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","marketing_staff"] },
  { key: "parent-notes", label: "Parent Notes", icon: NotebookPen, group: "people", path: "parent-notes",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin"] },

  // Finance
  { key: "fees", label: "Fees Center", icon: DollarSign, group: "finance", path: "fees",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","accountant"] },
  { key: "invoices", label: "Invoices", icon: FileText, group: "finance", path: "invoices",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "payments", label: "Payments", icon: CreditCard, group: "finance", path: "payments",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "expenses", label: "Expenses", icon: Receipt, group: "finance", path: "expenses",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "payroll", label: "Payroll", icon: Wallet, group: "finance", path: "payroll",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "ledger", label: "Cash Ledger", icon: BookOpen, group: "finance", path: "ledger",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "vendors", label: "Vendors", icon: Briefcase, group: "finance", path: "vendors",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
  { key: "tax", label: "Tax Center", icon: Receipt, group: "finance", path: "tax",
    roles: ["super_admin","school_owner","principal","vice_principal","accountant"] },
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
  { key: "counseling", label: "Counseling", icon: Heart, group: "operations", path: "counseling",
    roles: ["super_admin","school_owner","principal","vice_principal","school_admin","academic_coordinator","counselor"] },

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
 * Sidebar inheritance mirror of permissions.ts. super_admin, school_owner,
 * principal, and vice_principal see all staff modules in the sidebar.
 * Actual write/edit access is still enforced server-side by RLS + RPCs.
 */
const NAV_INHERITANCE: Partial<Record<EduverseRole, EduverseRole[]>> = {
  super_admin: [
    "school_owner","principal","vice_principal","school_admin","hr_manager",
    "accountant","academic_coordinator","teacher","marketing_staff",
    "counselor","student","parent",
  ],
  school_owner: [
    "principal","vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator","teacher","marketing_staff","counselor","student","parent",
  ],
  principal: [
    "vice_principal","school_admin","hr_manager","accountant",
    "academic_coordinator","counselor","marketing_staff",
  ],
  vice_principal: [
    "school_admin","hr_manager","accountant","academic_coordinator",
    "counselor","marketing_staff",
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
