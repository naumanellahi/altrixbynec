import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type PlatformAuthz = {
  loading: boolean;
  allowed: boolean;
  message: string | null;
};

/**
 * The Master Super Admin territory is reserved for a single hard-coded
 * platform owner. Even if extra rows exist in `platform_super_admins`,
 * only this email is allowed past the gate.
 */
export const MASTER_SUPER_ADMIN_EMAIL = "naumancheema643@gmail.com";

/**
 * Server-verified platform super admin check.
 * Requires BOTH:
 *   1. A row in `platform_super_admins` (RLS-scoped to the caller)
 *   2. The session email matches the hard-coded master email
 */
export function usePlatformSuperAdmin(userId: string | null | undefined): PlatformAuthz {
  const [state, setState] = useState<PlatformAuthz>({ loading: true, allowed: false, message: null });

  useEffect(() => {
    if (!userId) {
      setState({ loading: false, allowed: false, message: "Not signed in." });
      return;
    }

    let cancelled = false;
    setState({ loading: true, allowed: false, message: null });

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email?.toLowerCase() ?? null;

      if (email !== MASTER_SUPER_ADMIN_EMAIL) {
        if (!cancelled) {
          setState({
            loading: false,
            allowed: false,
            message: "Access denied. Master Super Admin only.",
          });
        }
        return;
      }

      const { data: psa, error } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setState({ loading: false, allowed: false, message: error.message });
        return;
      }

      setState({
        loading: false,
        allowed: !!psa?.user_id,
        message: psa?.user_id ? null : "Access denied. Master Super Admin only.",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

