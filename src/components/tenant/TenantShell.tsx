import { PropsWithChildren, useMemo, useState } from "react";
import { OfflineStatusIndicator } from "@/components/offline/OfflineStatusIndicator";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, Settings, Sparkles, Mic, GraduationCap, MessageSquare, Users, LayoutGrid, CalendarDays, ClipboardCheck, FileSpreadsheet, HeartHandshake, ChevronDown, Activity } from "lucide-react";
import type { EduverseRole } from "@/lib/eduverse-roles";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { VoiceController } from "@/components/common/VoiceController";
import { VOICE_COMMANDS } from "@/utils/voiceCommands";
import { DashboardNotificationsBanner } from "@/components/global/DashboardNotificationsBanner";
import { useUnreadMessagesOptimized } from "@/hooks/useUnreadMessagesOptimized";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";
import { useUserRole } from "@/hooks/useUserRole";
import { useOfflineUniversal } from "@/hooks/useOfflineUniversal";
import { buildMergedNav, GROUP_LABELS, GROUP_ORDER, DROPDOWN_MAPPING } from "@/lib/role-navigation";
import { resolvePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { StaffAttendanceWidget } from "./StaffAttendanceWidget";


type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  role: EduverseRole;
  schoolSlug: string;
}>;

export function TenantShell({ title, subtitle, role, schoolSlug, children }: Props) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [voiceListening, setVoiceListening] = useState(false);
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isGroupExpanded = (groupKey: string, childUrls: string[]) => {
    if (expandedGroups[groupKey] !== undefined) {
      return expandedGroups[groupKey];
    }
    return childUrls.some(
      (url) => location.pathname === url || location.pathname.startsWith(url + "/")
    );
  };

  const { user } = useSession();


  // Use optimized tenant hook that caches and applies branding automatically
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;

  const isStaff = useMemo(() => {
    return ["teacher", "principal", "vice_principal", "academic_coordinator", "counselor", "hr_manager", "accountant", "marketing_staff"].includes(role);
  }, [role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  // Handle voice command
  const handleVoiceCommand = (cmd: string) => {
    const cfg = VOICE_COMMANDS[cmd.toLowerCase().trim()];
    if (!cfg) {
      // Assuming toast from some library is available
      // Show error toast for unrecognized command
      // @ts-ignore
      toast.error(`Unrecognized command: ${cmd}`);
      return;
    }
    if (cfg.roles && !cfg.roles.includes(role)) {
      // @ts-ignore
      toast.warn('Command not allowed for your role');
      return;
    }
    if (cfg.action === 'logout') {
      handleLogout();
      return;
    }
    if (cfg.route) {
      navigate(cfg.route);
    }
  };

  // Offline support
  const offline = useOfflineUniversal({
    schoolId,
    userId: user?.id ?? null,
    role,
  });
  const { unreadCount } = useUnreadMessagesOptimized(schoolId, user?.id ?? null);

  // WordPress-style permission-driven sidebar.
  // The catalog is filtered by the union of the user's actual assigned roles
  // (read from user_roles). The visible URL role prefix stays as the current
  // route's role so existing dashboards & routes keep working unchanged.
  const { roles: assignedRoles } = useUserRole(schoolId, user?.id ?? null);
  const effectiveRoles = useMemo<EduverseRole[]>(() => {
    // Fall back to the current shell role until roles load, so the UI never
    // flashes empty for users whose user_roles row hasn't loaded yet.
    if (assignedRoles.length === 0) return [role];
    // Always include the current shell role (defensive).
    return Array.from(new Set<EduverseRole>([...assignedRoles, role]));
  }, [assignedRoles, role]);

  // Build sidebar from the centralized permission resolver so visibility
  // stays in lockstep with route-guard access checks.
  const { grouped } = useMemo(() => {
    const perms = resolvePermissions(effectiveRoles);
    // buildMergedNav already groups; rebuild from filtered modules so we
    // honour exactly the same set the resolver allows.
    const items = perms.visibleModules;
    const g: Record<string, typeof items> = {
      overview: [], academics: [], people: [], finance: [],
      operations: [], communication: [], admin: [],
    };
    for (const it of items) g[it.group].push(it);
    return { grouped: g as ReturnType<typeof buildMergedNav>["grouped"] };
  }, [effectiveRoles]);

  // Mobile bottom bar — role-aware. Keep to 5 items + "More" so nothing overflows.
  const bottomNavItems = useMemo<Array<{ to: string; icon: typeof LayoutGrid; label: string; badge?: number }>>(() => {
    const base = (path: string) => `/${schoolSlug}/${role}${path ? `/${path}` : ""}`;
    const home = { to: base(""), icon: LayoutGrid, label: "Home" };
    const messages = { to: base("messages"), icon: MessageSquare, label: "Messages", badge: unreadCount };

    if (role === "academic_coordinator") {
      return [
        home,
        { to: base("academic"), icon: GraduationCap, label: "Academic" },
import { PropsWithChildren, useMemo, useState } from "react";
import { OfflineStatusIndicator } from "@/components/offline/OfflineStatusIndicator";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, Settings, Sparkles, Mic, GraduationCap, MessageSquare, Users, LayoutGrid, CalendarDays, ClipboardCheck, FileSpreadsheet, HeartHandshake, ChevronDown, Activity } from "lucide-react";
import type { EduverseRole } from "@/lib/eduverse-roles";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { VoiceController } from "@/components/common/VoiceController";
import { VOICE_COMMANDS } from "@/utils/voiceCommands";
import { DashboardNotificationsBanner } from "@/components/global/DashboardNotificationsBanner";
import { useUnreadMessagesOptimized } from "@/hooks/useUnreadMessagesOptimized";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";
import { useUserRole } from "@/hooks/useUserRole";
import { useOfflineUniversal } from "@/hooks/useOfflineUniversal";
import { buildMergedNav, GROUP_LABELS, GROUP_ORDER, DROPDOWN_MAPPING } from "@/lib/role-navigation";
import { resolvePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { StaffAttendanceWidget } from "./StaffAttendanceWidget";


type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  role: EduverseRole;
  schoolSlug: string;
}>;

export function TenantShell({ title, subtitle, role, schoolSlug, children }: Props) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [voiceListening, setVoiceListening] = useState(false);
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isGroupExpanded = (groupKey: string, childUrls: string[]) => {
    if (expandedGroups[groupKey] !== undefined) {
      return expandedGroups[groupKey];
    }
    return childUrls.some(
      (url) => location.pathname === url || location.pathname.startsWith(url + "/")
    );
  };

  const { user } = useSession();


  // Use optimized tenant hook that caches and applies branding automatically
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;

  const isStaff = useMemo(() => {
    return ["teacher", "principal", "vice_principal", "academic_coordinator", "counselor", "hr_manager", "accountant", "marketing_staff"].includes(role);
  }, [role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  // Handle voice command
  const handleVoiceCommand = (cmd: string) => {
    const cfg = VOICE_COMMANDS[cmd.toLowerCase().trim()];
    if (!cfg) {
      // Assuming toast from some library is available
      // Show error toast for unrecognized command
      // @ts-ignore
      toast.error(`Unrecognized command: ${cmd}`);
      return;
    }
    if (cfg.roles && !cfg.roles.includes(role)) {
      // @ts-ignore
      toast.warn('Command not allowed for your role');
      return;
    }
    if (cfg.action === 'logout') {
      handleLogout();
      return;
    }
    if (cfg.route) {
      navigate(cfg.route);
    }
  };

  // Offline support
  const offline = useOfflineUniversal({
    schoolId,
    userId: user?.id ?? null,
    role,
  });
  const { unreadCount } = useUnreadMessagesOptimized(schoolId, user?.id ?? null);

  // WordPress-style permission-driven sidebar.
  // The catalog is filtered by the union of the user's actual assigned roles
  // (read from user_roles). The visible URL role prefix stays as the current
  // route's role so existing dashboards & routes keep working unchanged.
  const { roles: assignedRoles } = useUserRole(schoolId, user?.id ?? null);
  const effectiveRoles = useMemo<EduverseRole[]>(() => {
    // Fall back to the current shell role until roles load, so the UI never
    // flashes empty for users whose user_roles row hasn't loaded yet.
    if (assignedRoles.length === 0) return [role];
    // Always include the current shell role (defensive).
    return Array.from(new Set<EduverseRole>([...assignedRoles, role]));
  }, [assignedRoles, role]);

  // Build sidebar from the centralized permission resolver so visibility
  // stays in lockstep with route-guard access checks.
  const { grouped } = useMemo(() => {
    const perms = resolvePermissions(effectiveRoles);
    // buildMergedNav already groups; rebuild from filtered modules so we
    // honour exactly the same set the resolver allows.
    const items = perms.visibleModules;
    const g: Record<string, typeof items> = {
      overview: [], academics: [], people: [], finance: [],
      operations: [], communication: [], admin: [],
    };
    for (const it of items) g[it.group].push(it);
    return { grouped: g as ReturnType<typeof buildMergedNav>["grouped"] };
  }, [effectiveRoles]);

  // Mobile bottom bar — role-aware. Keep to 5 items + "More" so nothing overflows.
  const bottomNavItems = useMemo<Array<{ to: string; icon: typeof LayoutGrid; label: string; badge?: number }>>(() => {
    const base = (path: string) => `/${schoolSlug}/${role}${path ? `/${path}` : ""}`;
    const home = { to: base(""), icon: LayoutGrid, label: "Home" };
    const messages = { to: base("messages"), icon: MessageSquare, label: "Messages", badge: unreadCount };

    if (role === "academic_coordinator") {
      return [
        home,
        { to: base("academic"), icon: GraduationCap, label: "Academic" },
        { to: base("timetable"), icon: CalendarDays, label: "Timetable" },
        { to: base("attendance"), icon: ClipboardCheck, label: "Attend" },
        { to: base("exams"), icon: FileSpreadsheet, label: "Exams" },
      ];
    }
    return [];
  }, [role, schoolSlug, unreadCount]);

return (
  <>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <NavContent />
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voice command"
            onClick={() => {
              setVoiceListening((prev) => !prev);
              const feedback = new Audio(require('@/assets/voice_feedback.wav'));
              feedback.play();
            }}
            className={cn("rounded-xl", voiceListening && "animate-pulse")}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <div className="flex h-screen">
      {/* Sidebar for desktop */}
      <aside className="hidden md:block w-64 bg-primary/5 border-r overflow-y-auto">
        <NavContent />
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        {children}
      </main>
      {voiceListening && <VoiceController onCommand={handleVoiceCommand} onClose={() => setVoiceListening(false)} />}
    </div>
  </>
);
}
