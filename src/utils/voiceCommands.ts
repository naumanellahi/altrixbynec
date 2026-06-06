export type EduverseRole = "principal" | "teacher" | "staff" | "parent" | "vice_principal" | "academic_coordinator" | "counselor" | "hr_manager" | "accountant" | "marketing_staff";

export const VOICE_COMMANDS: Record<string, { route?: string; action?: string; roles?: EduverseRole[] }> = {
  "open attendance": { route: "/attendance-heatmap", roles: ["principal", "teacher", "staff"] },
  "show budget": { route: "/budget-simulator", roles: ["principal"] },
  "open collaboration": { route: "/collaboration", roles: ["principal", "teacher", "parent"] },
  "search": { route: "/search", roles: [] },
  "logout": { action: "logout" },
  "settings": { route: "/settings" },
};
