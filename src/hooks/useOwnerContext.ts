import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export interface OwnerSchool {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface OwnerCampus {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  principal_user_id: string | null;
}

const LS_KEY = "eduverse_owner_active_context";
export const ALL_CAMPUSES = "__all";

interface CachedCtx {
  schoolId: string | null;
  campusId: string | null;
}

function readCache(): CachedCtx {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { schoolId: null, campusId: null };
    return JSON.parse(raw);
  } catch {
    return { schoolId: null, campusId: null };
  }
}

function writeCache(ctx: CachedCtx) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

/**
 * Active school + campus context for the School Owner shell.
 * - schools: all schools the current user owns (or all, for platform admins)
 * - campuses: campuses for the active school
 * - activeCampusId === null  =>  "All campuses"
 */
export function useOwnerContext(currentSchoolId: string | null) {
  const { user } = useSession();
  const [schools, setSchools] = useState<OwnerSchool[]>([]);
  const [campuses, setCampuses] = useState<OwnerCampus[]>([]);
  const [activeCampusId, setActiveCampusIdState] = useState<string | null>(
    () => readCache().campusId
  );
  const [loading, setLoading] = useState(true);

  // Load schools list
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("owner_schools");
      if (cancel) return;
      if (!error && Array.isArray(data)) setSchools(data as OwnerSchool[]);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  // Load campuses for the active school
  useEffect(() => {
    if (!currentSchoolId) {
      setCampuses([]);
      return;
    }
    let cancel = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("owner_campuses", {
        _school_id: currentSchoolId,
      });
      if (cancel) return;
      if (!error && Array.isArray(data)) setCampuses(data as OwnerCampus[]);
    })();
    return () => {
      cancel = true;
    };
  }, [currentSchoolId]);

  // Hydrate persisted campus from server
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("owner_active_context")
        .select("active_school_id, active_campus_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.active_campus_id && currentSchoolId) {
        setActiveCampusIdState(data.active_campus_id);
        writeCache({ schoolId: currentSchoolId, campusId: data.active_campus_id });
      }
    })();
  }, [user?.id, currentSchoolId]);

  const setActiveCampus = useCallback(
    async (campusId: string | null) => {
      setActiveCampusIdState(campusId);
      writeCache({ schoolId: currentSchoolId, campusId });
      try {
        window.dispatchEvent(new Event("eduverse:owner-campus-change"));
      } catch {
        // ignore
      }
      if (!user) return;
      await (supabase as any)
        .from("owner_active_context")
        .upsert(
          {
            user_id: user.id,
            active_school_id: currentSchoolId,
            active_campus_id: campusId,
          },
          { onConflict: "user_id" }
        );
    },
    [user?.id, currentSchoolId]
  );

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === currentSchoolId) ?? null,
    [schools, currentSchoolId]
  );
  const activeCampus = useMemo(
    () => campuses.find((c) => c.id === activeCampusId) ?? null,
    [campuses, activeCampusId]
  );

  return {
    loading,
    schools,
    campuses,
    activeSchool,
    activeCampus,
    activeCampusId,
    setActiveCampus,
  };
}
