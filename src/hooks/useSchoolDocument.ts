import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SchoolDocumentBranding = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  motto: string | null;
};

const cache = new Map<string, SchoolDocumentBranding>();

export function useSchoolDocument(schoolId: string | null) {
  const [school, setSchool] = useState<SchoolDocumentBranding | null>(
    schoolId ? cache.get(schoolId) ?? null : null,
  );
  const [loading, setLoading] = useState(!school && !!schoolId);

  useEffect(() => {
    let cancelled = false;
    if (!schoolId) {
      setSchool(null);
      setLoading(false);
      return;
    }
    if (cache.has(schoolId)) {
      setSchool(cache.get(schoolId)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("schools")
        .select("id,name,slug,logo_url,address,phone,email,website,motto")
        .eq("id", schoolId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        cache.set(schoolId, data as SchoolDocumentBranding);
        setSchool(data as SchoolDocumentBranding);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return { school, loading };
}
