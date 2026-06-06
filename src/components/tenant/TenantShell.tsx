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

    return [
      home,
      messages,
      { to: base("academic"), icon: GraduationCap, label: "Academic" },
      { to: base("users"), icon: Users, label: "Staff" },
    ];
  }, [role, schoolSlug, unreadCount]);

  const NavContent = () => (
    <>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AltRix
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            /{schoolSlug} • {role}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role={role} />
            {/* Voice Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Voice command"
              onClick={() => setVoiceListening((prev) => !prev)}
              className="rounded-xl"
            >
              <Mic className="h-5 w-5" />
            </Button>
          <Button
            variant="soft"
            size="icon"
            aria-label="Search"
            className="rounded-xl"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="mt-5 space-y-3">
        {GROUP_ORDER.map((g) => {
          // Insert principal-only groups after the "operations" group
          if (g === "operations" && role === "principal") {
            return (
              <div key="principal-extras" className="space-y-0.5">
                {/* Attendance Heatmap */}
                <NavLink
                  to={`/${schoolSlug}/${role}/attendance-heatmap`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 shrink-0" /> Attendance Heatmap
                  </span>
                </NavLink>
                {/* Collaboration Hub */}
                <NavLink
                  to={`/${schoolSlug}/${role}/collaboration`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 shrink-0" /> Collaboration Hub
                  </span>
                </NavLink>
                {/* Budget Simulator */}
                <NavLink
                  to={`/${schoolSlug}/${role}/budget-simulator`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-4 w-4 shrink-0" /> Budget Simulator
                  </span>
                </NavLink>
              </div>
            );
          }

          const items = grouped[g];
          if (!items?.length) return null;

          const directItems: typeof items = [];
          const dropdownGroups: Record<string, { label: string; icon: any; items: typeof items }> = {};

          items.forEach((item) => {
            const mapping = DROPDOWN_MAPPING[item.key];
            if (mapping) {
              if (!dropdownGroups[mapping.groupKey]) {
                dropdownGroups[mapping.groupKey] = {
                  label: mapping.label,
                  icon: mapping.icon,
                  items: []
                };
              }
              dropdownGroups[mapping.groupKey].items.push(item);
            } else {
              directItems.push(item);
            }
          });

          return (
            <div key={g}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {GROUP_LABELS[g]}
              </p>
              <div className="space-y-0.5">
                {/* Direct Items */}
                {directItems.map((item) => {
                  const to = item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`;
                  const badge = item.key === "messages" ? unreadCount : 0;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.key}
                      to={to}
                      end={!item.path}
                      className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                      activeClassName="bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" /> {item.label}
                      </span>
                      {badge > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                          {badge > 99 ? "99+" : badge}
                        </Badge>
                      )}
                    </NavLink>
                  );
                })}

                {/* Collapsible Dropdown Groups */}
                {Object.entries(dropdownGroups).map(([groupKey, groupInfo]) => {
                  const childUrls = groupInfo.items.map(item =>
                    item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`
                  );
                  const isOpen = isGroupExpanded(groupKey, childUrls);
                  const isDropdownActive = childUrls.some(url => location.pathname === url || location.pathname.startsWith(url + "/"));
                  const GroupIcon = groupInfo.icon;

                  return (
                    <div key={groupKey} className="space-y-0.5">
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150",
                          isDropdownActive && "text-foreground font-semibold"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <GroupIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{groupInfo.label}</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground/60",
                            isOpen ? "rotate-180" : "rotate-0"
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          isOpen ? "max-h-[500px] opacity-100 mt-0.5" : "max-h-0 opacity-0 pointer-events-none"
                        )}
                      >
                        <div className="pl-4 ml-3 border-l border-border/40 space-y-0.5">
                          {groupInfo.items.map((item) => {
                            const to = item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`;
                            const badge = item.key === "messages" ? unreadCount : 0;
                            const Icon = item.icon;
                            return (
                              <NavLink
                                key={item.key}
                                to={to}
                                className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                                activeClassName="bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                                onClick={() => setMobileNavOpen(false)}
                              >
                                <span className="flex items-center gap-2.5">
                                  <Icon className="h-4 w-4 shrink-0" /> {item.label}
                                </span>
                                {badge > 0 && (
                                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                                    {badge > 99 ? "99+" : badge}
                                  </Badge>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <NavLink
          to={`/${schoolSlug}/${role}?settings=1`}
          end
          className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
          activeClassName="bg-primary text-primary-foreground shadow-soft"
          onClick={() => setMobileNavOpen(false)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role={role} />
            {/* Voice Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Voice command"
              onClick={() => setVoiceListening((prev) => !prev)}
              className="rounded-xl"
            >
              <Mic className="h-5 w-5" />
            </Button>
          <Button
            variant="soft"
            size="icon"
            aria-label="Search"
            className="rounded-xl"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="mt-5 space-y-3">
        {GROUP_ORDER.map((g) => {
          // Insert principal-only groups after the "operations" group
          if (g === "operations" && role === "principal") {
            return (
              <div key="principal-extras" className="space-y-0.5">
                {/* Attendance Heatmap */}
                <NavLink
                  to={`/${schoolSlug}/${role}/attendance-heatmap`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 shrink-0" /> Attendance Heatmap
                  </span>
                </NavLink>
                {/* Collaboration Hub */}
                <NavLink
                  to={`/${schoolSlug}/${role}/collaboration`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 shrink-0" /> Collaboration Hub
                  </span>
                </NavLink>
                {/* Budget Simulator */}
                <NavLink
                  to={`/${schoolSlug}/${role}/budget-simulator`}
                  className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary text-primary-foreground shadow-soft"
                >
                  <span className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-4 w-4 shrink-0" /> Budget Simulator
                  </span>
                </NavLink>
              </div>
            );
          }

          const items = grouped[g];
          if (!items?.length) return null;

          const directItems: typeof items = [];
          const dropdownGroups: Record<string, { label: string; icon: any; items: typeof items }> = {};

          items.forEach((item) => {
            const mapping = DROPDOWN_MAPPING[item.key];
            if (mapping) {
              if (!dropdownGroups[mapping.groupKey]) {
                dropdownGroups[mapping.groupKey] = {
                  label: mapping.label,
                  icon: mapping.icon,
                  items: []
                };
              }
              dropdownGroups[mapping.groupKey].items.push(item);
            } else {
              directItems.push(item);
            }
          });

          return (
            <div key={g}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {GROUP_LABELS[g]}
              </p>
              <div className="space-y-0.5">
                {/* Direct Items */}
                {directItems.map((item) => {
                  const to = item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`;
                  const badge = item.key === "messages" ? unreadCount : 0;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.key}
                      to={to}
                      end={!item.path}
                      className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                      activeClassName="bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" /> {item.label}
                      </span>
                      {badge > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                          {badge > 99 ? "99+" : badge}
                        </Badge>
                      )}
                    </NavLink>
                  );
                })}

                {/* Collapsible Dropdown Groups */}
                {Object.entries(dropdownGroups).map(([groupKey, groupInfo]) => {
                  const childUrls = groupInfo.items.map(item =>
                    item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`
                  );
                  const isOpen = isGroupExpanded(groupKey, childUrls);
                  const isDropdownActive = childUrls.some(url => location.pathname === url || location.pathname.startsWith(url + "/"));
                  const GroupIcon = groupInfo.icon;

                  return (
                    <div key={groupKey} className="space-y-0.5">
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150",
                          isDropdownActive && "text-foreground font-semibold"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <GroupIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{groupInfo.label}</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground/60",
                            isOpen ? "rotate-180" : "rotate-0"
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          isOpen ? "max-h-[500px] opacity-100 mt-0.5" : "max-h-0 opacity-0 pointer-events-none"
                        )}
                      >
                        <div className="pl-4 ml-3 border-l border-border/40 space-y-0.5">
                          {groupInfo.items.map((item) => {
                            const to = item.path ? `/${schoolSlug}/${role}/${item.path}` : `/${schoolSlug}/${role}`;
                            const badge = item.key === "messages" ? unreadCount : 0;
                            const Icon = item.icon;
                            return (
                              <NavLink
                                key={item.key}
                                to={to}
                                className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                                activeClassName="bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                                onClick={() => setMobileNavOpen(false)}
                              >
                                <span className="flex items-center gap-2.5">
                                  <Icon className="h-4 w-4 shrink-0" /> {item.label}
                                </span>
                                {badge > 0 && (
                                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                                    {badge > 99 ? "99+" : badge}
                                  </Badge>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <NavLink
          to={`/${schoolSlug}/${role}?settings=1`}
          end
          className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
          activeClassName="bg-primary text-primary-foreground shadow-soft"
          onClick={() => setMobileNavOpen(false)}
        >
          <Settings className="h-4 w-4 shrink-0" /> Settings
        </NavLink>
      </nav>

      <div className="mt-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-accent/40 to-transparent p-4">
        <p className="text-sm font-semibold text-foreground">All systems online</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Modules light up as your school activates them.
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

