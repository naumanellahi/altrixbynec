import { PropsWithChildren, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { DashboardNotificationsBanner } from "@/components/global/DashboardNotificationsBanner";
import { useUnreadMessagesOptimized } from "@/hooks/useUnreadMessagesOptimized";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";
import { useUserRole } from "@/hooks/useUserRole";
import { roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import {
  buildMergedNav, GROUP_LABELS, GROUP_ORDER, pickPrimaryRole,
} from "@/lib/role-navigation";

type Props = PropsWithChildren<{
  schoolSlug: string;
  title?: string;
  subtitle?: string;
}>;

/**
 * Additive shell that sits ABOVE existing dashboards.
 * - Reads all of the user's roles
 * - Builds a single merged sidebar (deduped by module key)
 * - Routes each item to the existing `/{slug}/{primaryRole}/{path}` URL
 *   so current TenantDashboard / per-role dashboards keep handling it.
 *
 * No existing routes, modules, permissions, or DB are modified.
 */
export function RoleAwareShell({ schoolSlug, title, subtitle, children }: Props) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSession();
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;
  const { roles, loading } = useUserRole(schoolId, user?.id ?? null);
  const { unreadCount } = useUnreadMessagesOptimized(schoolId, user?.id ?? null);

  const primaryRole = useMemo<EduverseRole | null>(
    () => pickPrimaryRole(roles),
    [roles],
  );

  const { grouped } = useMemo(() => buildMergedNav(roles), [roles]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  const base = `/${schoolSlug}/${primaryRole ?? "student"}`;

  const NavBody = () => (
    <>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AltRix
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            /{schoolSlug}
            {roles.length > 0 && ` • ${roles.map((r) => roleLabel[r]).join(" + ")}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role={primaryRole ?? "student"} />
          <Button
            variant="soft" size="icon" aria-label="Search" className="rounded-xl"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="mt-5 space-y-3">
        {GROUP_ORDER.map((g) => {
          const items = grouped[g];
          if (!items?.length) return null;
          return (
            <div key={g}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {GROUP_LABELS[g]}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const to = item.path ? `${base}/${item.path}` : base;
                  const badge = item.key === "messages" ? unreadCount : 0;
                  return (
                    <NavLink
                      key={item.key}
                      to={to}
                      end={!item.path}
                      className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                      activeClassName="bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" /> {item.label}
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
          );
        })}
      </nav>

      <div className="mt-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-accent/40 to-transparent p-4">
        <p className="text-sm font-semibold text-foreground">Unified workspace</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Modules merged from all your roles. Existing dashboards remain available.
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <GlobalCommandPalette basePath={base} />

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-4 overflow-y-auto">
              <NavBody />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight truncate">
              {title ?? "Workspace"}
            </p>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role={primaryRole ?? "student"} />
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="sticky top-6 hidden self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-border/60 bg-surface/80 p-4 shadow-soft backdrop-blur-sm lg:block no-scrollbar">
          <NavBody />
        </aside>

        <section className="rounded-2xl border border-border/40 bg-surface p-4 shadow-soft sm:p-5 lg:rounded-3xl lg:p-6">
          <header className="mb-5 hidden lg:mb-6 lg:block">
            <p className="font-display text-2xl font-semibold tracking-tight">
              {title ?? "Unified Workspace"}
            </p>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </header>
          <div className="mb-4 lg:mb-5">
            <DashboardNotificationsBanner schoolId={schoolId} schoolSlug={schoolSlug} role={primaryRole ?? "student"} />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading workspace…</p>
          ) : (
            children
          )}
        </section>
      </div>
    </div>
  );
}
