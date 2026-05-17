import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveTeacherStatus {
  teacherUserId: string;
  teacherName: string;
  status: "in_class" | "left" | "late" | "not_checked_in";
  enteredAt: string | null;
  leftAt: string | null;
  updatedAt: string | null;
  subject: string;
  sectionLabel: string | null;
  className: string | null;
  room: string | null;
  periodLabel: string;
  startTime: string | null;
  endTime: string | null;
  timetableEntryId: string;
}

interface TimetableEntry {
  id: string;
  subject_name: string;
  teacher_user_id: string | null;
  class_section_id: string | null;
  room: string | null;
  period_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
}

interface Period {
  id: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  is_break: boolean;
}

function timeToMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function useLiveTeacherPresence(schoolId: string | null) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<Map<string, { name: string; class_name: string | null }>>(new Map());
  const [teachers, setTeachers] = useState<Map<string, string>>(new Map());
  const [presenceRows, setPresenceRows] = useState<Map<string, { status: string; entered_at: string | null; left_at: string | null; updated_at: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // Tick every minute so "current" period is always fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadStatic = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const today = new Date().getDay();
    const [ttRes, periodsRes, sectionsRes, dirRes] = await Promise.all([
      supabase
        .from("timetable_entries")
        .select("id, subject_name, teacher_user_id, class_section_id, room, period_id, day_of_week, start_time, end_time")
        .eq("school_id", schoolId)
        .eq("day_of_week", today),
      supabase
        .from("timetable_periods")
        .select("id, label, start_time, end_time, sort_order, is_break")
        .eq("school_id", schoolId)
        .order("sort_order"),
      supabase
        .from("class_sections")
        .select("id, name, class_id, academic_classes(name)")
        .eq("school_id", schoolId),
      supabase.rpc("get_school_user_directory", { _school_id: schoolId }),
    ]);

    setEntries((ttRes.data as TimetableEntry[] | null) ?? []);
    setPeriods((periodsRes.data as Period[] | null) ?? []);
    const sMap = new Map<string, { name: string; class_name: string | null }>();
    (sectionsRes.data as any[] | null)?.forEach((s) => {
      sMap.set(s.id, { name: s.name, class_name: s.academic_classes?.name ?? null });
    });
    setSections(sMap);
    const tMap = new Map<string, string>();
    (dirRes.data as any[] | null)?.forEach((u) => {
      tMap.set(u.user_id, u.display_name ?? u.email ?? "Teacher");
    });
    setTeachers(tMap);
    setLoading(false);
  }, [schoolId]);

  const loadPresence = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await (supabase as any)
      .from("teacher_period_presence")
      .select("timetable_entry_id, status, entered_at, left_at, updated_at")
      .eq("school_id", schoolId)
      .eq("period_date", todayISO());
    const map = new Map<string, { status: string; entered_at: string | null; left_at: string | null; updated_at: string }>();
    (data as any[] | null)?.forEach((r) => {
      map.set(r.timetable_entry_id, {
        status: r.status,
        entered_at: r.entered_at,
        left_at: r.left_at,
        updated_at: r.updated_at,
      });
    });
    setPresenceRows(map);
  }, [schoolId]);

  useEffect(() => {
    loadStatic();
  }, [loadStatic]);

  useEffect(() => {
    loadPresence();
  }, [loadPresence]);

  useEffect(() => {
    if (!schoolId) return;
    const ch = supabase
      .channel(`live_presence_${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_period_presence",
          filter: `school_id=eq.${schoolId}`,
        },
        () => loadPresence(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [schoolId, loadPresence]);

  const periodMap = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);

  const liveTeachers = useMemo<LiveTeacherStatus[]>(() => {
    const curMin = now.getHours() * 60 + now.getMinutes();
    const result: LiveTeacherStatus[] = [];
    entries.forEach((e) => {
      if (!e.teacher_user_id) return;
      const p = periodMap.get(e.period_id);
      const start = timeToMin(e.start_time ?? p?.start_time ?? null);
      const end = timeToMin(e.end_time ?? p?.end_time ?? null);
      if (start == null || end == null) return;
      if (curMin < start || curMin > end) return;
      if (p?.is_break) return;
      const presence = presenceRows.get(e.id);
      const sec = e.class_section_id ? sections.get(e.class_section_id) : undefined;
      result.push({
        teacherUserId: e.teacher_user_id,
        teacherName: teachers.get(e.teacher_user_id) ?? "Teacher",
        status: (presence?.status as any) ?? "not_checked_in",
        enteredAt: presence?.entered_at ?? null,
        leftAt: presence?.left_at ?? null,
        updatedAt: presence?.updated_at ?? null,
        subject: e.subject_name,
        sectionLabel: sec?.name ?? null,
        className: sec?.class_name ?? null,
        room: e.room,
        periodLabel: p?.label ?? "Period",
        startTime: e.start_time ?? p?.start_time ?? null,
        endTime: e.end_time ?? p?.end_time ?? null,
        timetableEntryId: e.id,
      });
    });
    return result.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [entries, periodMap, presenceRows, sections, teachers, now]);

  return { liveTeachers, loading, refetch: loadPresence };
}
