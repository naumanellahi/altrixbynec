import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users2,
  ShieldCheck,
  Activity,
  Receipt,
  ScrollText,
  Settings,
  LogOut,
  Crown,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { label: string; to: string; icon: any; badge?: string };

const NAV: { section: string; items: Item[] }[] = [
  {
    section: "Platform",
    items: [
      { label: "Overview", to: "/super_admin", icon: LayoutDashboard },
      { label: "Schools", to: "/super_admin/schools", icon: Building2 },
      { label: "Owners & Admins", to: "/super_admin/directory", icon: Users2 },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Billing & Plans", to: "/super_admin/billing", icon: Receipt, badge: "Soon" },
      { label: "Audit Log", to: "/super_admin/audit", icon: ScrollText, badge: "Soon" },
      { label: "System Health", to: "/super_admin/health", icon: Activity, badge: "Soon" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Security", to: "/super_admin/security", icon: ShieldCheck, badge: "Soon" },
      { label: "Settings", to: "/super_admin/settings", icon: Settings, badge: "Soon" },
    ],
  },
];

type Props = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SuperAdminShell({ title, subtitle, actions, children }: Props) {
  const { user } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const isActive = (to: string) => {
    if (to === "/super_admin") return pathname === "/super_admin";
    return pathname.startsWith(to);
  };

  return (
    <div
      className="min-h-screen flex w-full text-slate-100"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, hsl(230 70% 22% / 0.55), transparent 60%)," +
          "radial-gradient(900px 600px at 110% 10%, hsl(265 70% 25% / 0.45), transparent 55%)," +
          "linear-gradient(180deg, hsl(230 40% 8%), hsl(230 40% 6%))",
      }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 border-r flex flex-col"
        style={{
          background: "hsl(230 40% 7% / 0.85)",
          borderColor: "hsl(230 30% 18%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: "hsl(230 30% 18%)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 90% 50%))",
                boxShadow: "0 4px 16px hsl(45 90% 50% / 0.35)",
              }}
            >
              <Crown className="h-5 w-5 text-slate-900" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80 font-semibold">
                Master Admin
              </p>
              <p className="text-sm font-bold text-slate-100">Control Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-slate-400/70 font-semibold">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.to);
                  const Icon = item.icon;
                  const disabled = item.badge === "Soon";
                  return (
                    <li key={item.to}>
                      {disabled ? (
                        <div
                          className="flex items-center justify-between px-3 py-2 text-sm rounded-md text-slate-500 cursor-not-allowed"
                          title="Coming soon"
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.to}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-all ${
                            active
                              ? "bg-amber-400/10 text-amber-200 border-l-2 border-amber-400 font-semibold"
                              : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "hsl(230 30% 18%)" }}>
          <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-white/[0.03]">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-slate-900"
              style={{ background: "hsl(45 95% 60%)" }}
            >
              {(user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
              <p className="text-[10px] text-amber-300/70">Platform Owner</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 px-6 flex items-center justify-between border-b sticky top-0 z-30"
          style={{
            background: "hsl(230 40% 6% / 0.7)",
            borderColor: "hsl(230 30% 18%)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-100 truncate">
                {title || "Master Admin"}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search schools, owners…"
                className="pl-9 h-9 w-72 bg-white/[0.04] border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus-visible:ring-amber-400/30"
              />
            </div>
            {actions}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
