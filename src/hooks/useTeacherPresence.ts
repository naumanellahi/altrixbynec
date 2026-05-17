import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceStatus = "in_class" | "left" | "late";

export interface PresenceRow {
  id: string;
  timetable_entry_id: string;
  status: PresenceStatus;
  entered_at: string | null;
  left_at: string | null;
  period_date: string;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Manages the current teacher's period-presence rows for today.
 */
export function useTeacherPresence(schoolId: string | null, teacherUserId: string | null) {
  const [rows, setRows] = useState<Map<string, PresenceRow>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId || !teacherUserId) return;
    const { data, error } = await (supabase as any)
      .from("teacher_period_presence")
      .select("id, timetable_entry_id, status, entered_at, left_at, period_date")
      .eq("school_id", schoolId)
      .eq("teacher_user_id", teacherUserId)
      .eq("period_date", todayISO());
    if (error) return;
    const map = new Map<string, PresenceRow>();
    (data as PresenceRow[] | null)?.forEach((r) => map.set(r.timetable_entry_id, r));
    setRows(map);
  }, [schoolId, teacherUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime sync of own presence
  useEffect(() => {
    if (!schoolId || !teacherUserId) return;
    const ch = supabase
      .channel(`teacher_presence_self_${teacherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_period_presence",
          filter: `teacher_user_id=eq.${teacherUserId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [schoolId, teacherUserId, load]);

  const setStatus = useCallback(
    async (timetableEntryId: string, status: PresenceStatus) => {
      if (!schoolId || !teacherUserId) return;
      setSaving(timetableEntryId);
      const nowIso = new Date().toISOString();
      const existing = rows.get(timetableEntryId);
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        teacher_user_id: teacherUserId,
        timetable_entry_id: timetableEntryId,
        period_date: todayISO(),
        status,
      };
      if (status === "in_class") {
        payload.entered_at = existing?.entered_at ?? nowIso;
        payload.left_at = null;
      } else if (status === "left") {
        payload.entered_at = existing?.entered_at ?? null;
        payload.left_at = nowIso;
      } else if (status === "late") {
        payload.entered_at = nowIso;
      }
      const { error } = await (supabase as any)
        .from("teacher_period_presence")
        .upsert(payload, {
          onConflict: "school_id,teacher_user_id,timetable_entry_id,period_date",
        });
      setSaving(null);
      if (!error) await load();
      return error;
    },
    [schoolId, teacherUserId, rows, load],
  );

  return { rows, setStatus, saving, refetch: load };
}
