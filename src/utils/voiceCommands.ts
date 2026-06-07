import type { EduverseRole } from "@/lib/eduverse-roles";

export interface VoiceCommandConfig {
  /** Relative path segment, e.g. "/attendance" — will be prefixed with /{slug}/{role} */
  route?: string;
  /** Special non-navigation action */
  action?: "logout" | "search" | "open-search";
  /**
   * Roles that can use this command.
   * Empty array = available to ALL roles.
   */
  roles?: EduverseRole[];
}

/**
 * Comprehensive voice command map.
 * Keys are lowercase spoken phrases. Values define the action.
 * Voice handler in TenantShell / TeacherShell builds the full URL from cfg.route.
 */
export const VOICE_COMMANDS: Record<string, VoiceCommandConfig> = {
  // ── Dashboard / Root ─────────────────────────────────────────────────────
  "go to dashboard":        { route: "", roles: [] },
  "open dashboard":         { route: "", roles: [] },
  "home":                   { route: "", roles: [] },

  // ── Academics ────────────────────────────────────────────────────────────
  "open academic":          { route: "/academic", roles: [] },
  "open academics":         { route: "/academic", roles: [] },
  "open timetable":         { route: "/timetable", roles: [] },
  "go to timetable":        { route: "/timetable", roles: [] },
  "open attendance":        { route: "/attendance", roles: [] },
  "go to attendance":       { route: "/attendance", roles: [] },
  "open exams":             { route: "/exams", roles: [] },
  "open report cards":      { route: "/report-cards", roles: [] },
  "open diary":             { route: "/diary", roles: [] },
  "open homework":          { route: "/homework", roles: ["teacher"] },
  "open assignments":       { route: "/assignments", roles: ["teacher"] },
  "open gradebook":         { route: "/gradebook", roles: ["teacher"] },
  "open lesson plans":      { route: "/lesson-plans", roles: ["teacher"] },
  "open student progress":  { route: "/progress", roles: ["teacher"] },

  // ── People / HR ───────────────────────────────────────────────────────────
  "open staff":             { route: "/users", roles: [] },
  "open users":             { route: "/users", roles: [] },
  "open leaves":            { route: "/leaves", roles: [] },
  "open salaries":          { route: "/salaries", roles: ["principal","vice_principal","hr_manager","school_owner","super_admin"] },
  "open staff attendance":  { route: "/staff-attendance", roles: ["principal","vice_principal","hr_manager","school_owner","super_admin"] },
  "open contracts":         { route: "/contracts", roles: ["principal","vice_principal","hr_manager","school_owner","super_admin"] },
  "open recruitment":       { route: "/recruitment", roles: ["principal","vice_principal","hr_manager","school_owner","super_admin"] },
  "open hr analytics":      { route: "/hr-analytics", roles: ["principal","vice_principal","hr_manager","school_owner","super_admin"] },

  // ── Admissions & CRM ──────────────────────────────────────────────────────
  "open admissions":        { route: "/admissions", roles: [] },
  "open crm":               { route: "/crm", roles: [] },
  "open leads":             { route: "/leads", roles: [] },
  "open campaigns":         { route: "/campaigns", roles: [] },

  // ── Finance ───────────────────────────────────────────────────────────────
  "open fees":              { route: "/fees", roles: [] },
  "open finance":           { route: "/finance", roles: [] },
  "open invoices":          { route: "/invoices", roles: [] },
  "open payments":          { route: "/payments", roles: [] },
  "open expenses":          { route: "/expenses", roles: [] },
  "open payroll":           { route: "/payroll", roles: [] },
  "open budget":            { route: "/budget-simulator", roles: ["principal","vice_principal","accountant","school_owner","super_admin"] },
  "show budget":            { route: "/budget-simulator", roles: ["principal","vice_principal","accountant","school_owner","super_admin"] },
  "open budget simulator":  { route: "/budget-simulator", roles: ["principal","vice_principal","accountant","school_owner","super_admin"] },

  // ── Operations ────────────────────────────────────────────────────────────
  "open notices":           { route: "/notices", roles: [] },
  "open holidays":          { route: "/holidays", roles: [] },
  "open reports":           { route: "/reports", roles: [] },
  "open complaints":        { route: "/complaints", roles: [] },
  "open counseling":        { route: "/counseling", roles: [] },
  "open behavior notes":    { route: "/behavior", roles: [] },
  "open attendance heatmap":{ route: "/attendance-heatmap", roles: ["principal","vice_principal","school_owner","super_admin"] },
  "show heatmap":           { route: "/attendance-heatmap", roles: ["principal","vice_principal","school_owner","super_admin"] },

  // ── Communication ────────────────────────────────────────────────────────
  "open messages":          { route: "/messages", roles: [] },
  "go to messages":         { route: "/messages", roles: [] },
  "open collaboration":     { route: "/collaboration", roles: ["principal","vice_principal","school_admin","school_owner","super_admin"] },
  "open collaboration hub": { route: "/collaboration", roles: ["principal","vice_principal","school_admin","school_owner","super_admin"] },
  "open support":           { route: "/support", roles: [] },

  // ── Global actions ───────────────────────────────────────────────────────
  "search":                 { action: "open-search", roles: [] },
  "open search":            { action: "open-search", roles: [] },
  "settings":               { route: "?settings=1", roles: [] },
  "open settings":          { route: "?settings=1", roles: [] },
  "logout":                 { action: "logout", roles: [] },
  "sign out":               { action: "logout", roles: [] },
  "log out":                { action: "logout", roles: [] },
};
