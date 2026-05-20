import { PropsWithChildren, useEffect, useRef } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";

/**
 * Route-level access guard.
 *
 * Validates that the path segment after `/{schoolSlug}/{role}/` is allowed
 * by the current user's permission bundle. If not, redirects to the role
 * dashboard root and surfaces a toast — so manually typed URLs cannot
 * bypass the sidebar visibility rules.
 */
export function RouteGuard({ children }: PropsWithChildren) {
  const { schoolSlug, role } = useParams();
  const location = useLocation();
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;
  const perms = usePermissions(schoolId);
  const warnedRef = useRef<string | null>(null);

  // Extract the path segment after `/{slug}/{role}/`
  const base = `/${schoolSlug}/${role}`;
  const remainder = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length).replace(/^\/+/, "")
    : "";
  const segment = remainder.split("/")[0] ?? "";

  const allowed = perms.loading ? true : perms.canAccess(segment);

  useEffect(() => {
    if (!perms.loading && !allowed && warnedRef.current !== segment) {
      warnedRef.current = segment;
      toast.error("You don't have access to that page.");
    }
  }, [perms.loading, allowed, segment]);

  if (!perms.loading && !allowed) {
    return <Navigate to={base} replace />;
  }
  return <>{children}</>;
}
