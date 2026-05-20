import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { RoleAwareShell } from "@/components/tenant/RoleAwareShell";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useUserRole } from "@/hooks/useUserRole";
import { buildMergedNav, GROUP_LABELS, GROUP_ORDER, pickPrimaryRole } from "@/lib/role-navigation";
import { roleLabel } from "@/lib/eduverse-roles";

/**
 * Optional unified workspace landing page.
 * Reachable at `/:schoolSlug/hub` — does NOT replace existing dashboards.
 * Existing role dashboards (/teacher, /hr, /accountant, etc.) keep working.
 */
export default function UnifiedHub() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const slug = schoolSlug ?? "";
  const { user } = useSession();
  const tenant = useTenantOptimized(slug);
  const { roles } = useUserRole(tenant.schoolId, user?.id ?? null);
  const primary = useMemo(() => pickPrimaryRole(roles), [roles]);
  const { grouped } = useMemo(() => buildMergedNav(roles), [roles]);
  const base = `/${slug}/${primary ?? "student"}`;

  return (
    <RoleAwareShell
      schoolSlug={slug}
      title="Welcome back"
      subtitle={roles.length > 1 ? "Your roles have been merged into one workspace." : undefined}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GROUP_ORDER.map((g) => {
          const items = grouped[g];
          if (!items?.length) return null;
          return (
            <div key={g} className="rounded-3xl border border-border/50 bg-surface p-5 shadow-soft">
              <p className="font-display text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                {GROUP_LABELS[g]}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {items.map((it) => (
                  <Link
                    key={it.key}
                    to={it.path ? `${base}/${it.path}` : base}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <it.icon className="h-4 w-4 text-primary" />
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {roles.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No roles assigned yet for this school.
          </div>
        )}

        {roles.length > 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-border/40 bg-gradient-to-br from-primary/5 to-transparent p-5">
            <p className="text-sm font-semibold">Your roles</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {roles.map((r) => roleLabel[r]).join(" • ")}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Each module above opens the existing dashboard for that area — nothing has been replaced.
            </p>
          </div>
        )}
      </div>
    </RoleAwareShell>
  );
}
