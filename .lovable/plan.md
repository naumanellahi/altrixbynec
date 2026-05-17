## Goal
Extend the live teacher-presence system with: principal toast notifications on status changes, a per-teacher collapsible "today" timeline, auto-detection of `late` state, and an audit log with optional reason.

## DB (additive)
1. New table `teacher_presence_audit` — school_id, teacher_user_id, timetable_entry_id, period_date, changed_by_user_id, old_status (nullable), new_status, reason (nullable), created_at.
   - RLS: insert allowed for any school member acting as themselves; SELECT for principal / vice principal / school_owner / super_admin / academic_coordinator / platform admin.
2. Trigger `trg_teacher_presence_audit` on `teacher_period_presence` AFTER INSERT/UPDATE → inserts audit row capturing `auth.uid()` as `changed_by_user_id`, plus `OLD.status` → `NEW.status` and `NEW.notes` as reason.
3. Add `reason` column to `teacher_period_presence` (nullable text) — single source feeding the trigger.

## Backend behaviour
- `useTeacherPresence.setStatus(entryId, status, opts?)` accepts `{ reason?: string; startTimeMin?: number }`.
  - If `status === "in_class"` and current minute > startTimeMin → coerce to `"late"`.
  - Writes `reason` to the row (nullable).

## Teacher UI (`MyScheduleWidget`)
- Pass the entry's `startTime` so the hook can auto-promote to `late`.
- When clicking the red button OR when green→late, open a lightweight inline dialog asking for an optional reason (textarea + Submit/Skip). Green-on-time still saves without prompting.

## Principal UI
- **Toast notifications** (`LiveTeacherPresenceCard`): in the realtime subscription, on each new payload (`INSERT` or status-changed `UPDATE`) fire a `toast()` "{teacher} marked {status} — {subject} ({period label})". De-dup by row id+updated_at to avoid duplicates from the initial fetch.
- **Per-teacher timeline**: under the live grid add a `Collapsible` "Today's Teaching Timeline" listing every teacher with at least one timetable entry today; each row expands to show all periods today (start–end • subject • section • room) with a colored dot per status (in_class/late/left/scheduled). Uses the data already fetched in the hook.

## Files
- New migration: audit table + reason column + trigger + RLS + realtime.
- Edit: `src/hooks/useTeacherPresence.ts` (reason + late auto-detect).
- Edit: `src/components/teacher/MyScheduleWidget.tsx` (reason dialog, late detection input).
- Edit: `src/hooks/useLiveTeacherPresence.ts` (expose per-teacher timeline + presence by entry id).
- Edit: `src/components/principal/LiveTeacherPresenceCard.tsx` (toast on realtime change + collapsible timeline section).