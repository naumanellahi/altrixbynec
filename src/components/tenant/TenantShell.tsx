import { PropsWithChildren, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { BarChart3, BookOpen, CalendarDays, Coins, GraduationCap, Headphones, KanbanSquare, LayoutGrid, LogOut, Megaphone, Menu, MessageSquare, NotebookPen, Settings, ShieldAlert, ShieldCheck, Sparkles, Users, FileText, PartyPopper } from "lucide-react";
import type { EduverseRole } from "@/lib/eduverse-roles";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { DashboardNotificationsBanner } from "@/components/global/DashboardNotificationsBanner";
import { useUnreadMessagesOptimized } from "@/hooks/useUnreadMessagesOptimized";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  role: EduverseRole;
  schoolSlug: string;
}>;

export function TenantShell({ title, subtitle, role, schoolSlug, children }: Props) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useSession();
  
  // Use optimized tenant hook that caches and applies branding automatically
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  const { unreadCount } = useUnreadMessagesOptimized(schoolId, user?.id ?? null);

  const navItems = [
    { to: `/${schoolSlug}/${role}`, icon: LayoutGrid, label: "Dashboard", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/messages`, icon: MessageSquare, label: "Messages", show: true, badge: unreadCount },
    { to: `/${schoolSlug}/${role}/admin`, icon: ShieldCheck, label: "Admin", show: role === "super_admin", badge: 0 },
    { to: `/${schoolSlug}/${role}/schools`, icon: ShieldCheck, label: "Schools", show: role === "super_admin", badge: 0 },
    { to: `/${schoolSlug}/${role}/users`, icon: Users, label: "Staff", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/crm`, icon: KanbanSquare, label: "CRM", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/academic`, icon: GraduationCap, label: "Academic", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/timetable`, icon: CalendarDays, label: "Timetable", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/attendance`, icon: GraduationCap, label: "Attendance", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/exams`, icon: GraduationCap, label: "Exams", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/report-cards`, icon: FileText, label: "Report Cards", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/diary`, icon: BookOpen, label: "Diary", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/notices`, icon: Megaphone, label: "Notices", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/holidays`, icon: PartyPopper, label: "Holidays", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/finance`, icon: Coins, label: "Finance", show: ["principal", "vice_principal", "accountant", "super_admin", "school_owner"].includes(role), badge: 0 },
    { to: `/${schoolSlug}/${role}/reports`, icon: BarChart3, label: "Reports", show: true, badge: 0 },
    { to: `/${schoolSlug}/${role}/complaints`, icon: ShieldAlert, label: "Complaints", show: ["principal", "vice_principal", "school_admin", "school_owner", "super_admin"].includes(role), badge: 0 },
    { to: `/${schoolSlug}/${role}/parent-notes`, icon: NotebookPen, label: "Parent Notes", show: ["principal", "vice_principal", "school_admin", "school_owner", "super_admin"].includes(role), badge: 0 },
    { to: `/${schoolSlug}/${role}/support`, icon: Headphones, label: "Support", show: ["principal", "vice_principal", "super_admin", "school_owner", "hr_manager"].includes(role), badge: 0 },
    { to: `/${schoolSlug}/${role}?settings=1`, icon: Settings, label: "Settings", show: true, badge: 0 },
  ].filter(item => item.show);

  // Bottom navigation items for mobile (limited to 5 key items)
  const bottomNavItems = [
    { to: `/${schoolSlug}/${role}`, icon: LayoutGrid, label: "Home" },
    { to: `/${schoolSlug}/${role}/messages`, icon: MessageSquare, label: "Messages", badge: unreadCount },
    { to: `/${schoolSlug}/${role}/academic`, icon: GraduationCap, label: "Academic" },
    { to: `/${schoolSlug}/${role}/users`, icon: Users, label: "Staff" },
  ];

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

      <nav className="mt-5 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${schoolSlug}/${role}`}
            className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
            activeClassName="bg-primary text-primary-foreground shadow-sog shadow-soft hover:bg-primary hover:text-primary-foreground"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className="h-4 w-4 shrink-0" /> {item.label}
            </span>
            {item.badge > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
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

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <GlobalCommandPalette basePath={`/${schoolSlug}/${role}`} />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-4 overflow-y-auto">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role={role} />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        {/* Desktop Sidebar */}
        <aside className="sticky top-6 hidden self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-border/60 bg-surface/80 p-4 shadow-soft backdrop-blur-sm lg:block no-scrollbar">
          <NavContent />
        </aside>

        {/* Main Content */}
        <section className="rounded-2xl border border-border/40 bg-surface p-4 shadow-soft sm:p-5 lg:rounded-3xl lg:p-6">
          <header className="mb-5 hidden lg:mb-6 lg:block">
            <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </header>
          <div className="mb-4 lg:mb-5">
            <DashboardNotificationsBanner schoolId={schoolId} schoolSlug={schoolSlug} role={role} />
          </div>
          {children}
        </section>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center justify-around gap-1 rounded-3xl border border-border/60 bg-background/90 px-2 py-1.5 shadow-elevated backdrop-blur-xl lg:hidden w-[calc(100%-1.5rem)] max-w-md">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${schoolSlug}/${role}`}
            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-muted-foreground transition-all duration-200"
            activeClassName="text-primary-foreground bg-primary shadow-soft"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            {"badge" in item && item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-muted-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </nav>
    </div>
  );
}
