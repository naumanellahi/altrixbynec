## Goal

Let teachers mark themselves "In Class" (green) or "Left/Late" (red) for the current period directly from their dashboard's My Schedule widget, and let principals see a live "Who's teaching right now" board with status, period, subject, section, and room.

## Database (additive only)

New table `teacher_period_presence`:
- school_id (uuid)
- teacher_user_id (uuid)
- timetable_entry_id (uuid)  — links to the schedule period
- period_date (date)
- status (text: 'in_class' | 'left' | 'late')
- entered_at (timestamptz, nullable)
- left_at (timestamptz, nullable)
- notes (text, nullable)
- created_at / updated_at
- Unique index on (school_id, teacher_user_id, timetable_entry_id, period_date)

RLS:
- Teacher can insert/update their own rows in their school
- Principal / vice_principal / school_owner / super_admin can SELECT all rows in their school

Realtime: enable on `teacher_period_presence` for live principal updates.

No changes to existing tables. Follows core rule: purely additive.

## Frontend

### 1. Teacher MyScheduleWidget (`src/components/teacher/MyScheduleWidget.tsx`)
On each period row that is the **current** period (today + within time window), add two round icon buttons next to the existing complete/log button:
- 🟢 Green check button → marks `in_class`, sets `entered_at = now()`
- 🔴 Red X button → marks `left`, sets `left_at = now()`

Selected state is visually filled (solid green/red); unselected is outline. Both buttons reflect the current presence row for that period.

Optimistic update + toast feedback. Disabled while saving.

### 2. New hook `useTeacherPresence(schoolId, teacherUserId)`
- Loads today's presence rows for the teacher
- Provides `setStatus(entryId, status)` mutation (upserts)
- Subscribes to realtime changes

### 3. Principal live board — new component `LiveTeacherPresenceCard`
Shows for each teacher currently in a scheduled period today:
- Teacher name + avatar
- Status pill: 🟢 In Class / 🔴 Left / ⚪ Not checked in
- Subject • Section • Room
- Period label + time
- "Last update: X mins ago"

Realtime updates via Supabase channel on `teacher_period_presence` filtered by school_id.

Mount the card in `PrincipalHome.tsx` (top of dashboard) and in `PrincipalTeachersTab.tsx` as a top section so principal sees it both on dashboard and in the Teachers area.

### Technical details

- Uses existing `useTeacherSchedule` hook to know the current period id
- Status query joins `timetable_entries` → subject, section, room, period, teacher (server-side via SQL view or client-side join from already-fetched timetable + presence)
- All colors via semantic tokens (status colors use existing `bg-primary` for green-equivalent — actually we'll add `success` token if absent; otherwise use HSL via CSS vars). Keep using `text-primary` / `text-destructive` semantics already in widget.
- Currency / unrelated areas untouched.

## Files

New:
- `src/hooks/useTeacherPresence.ts`
- `src/hooks/useLiveTeacherPresence.ts` (principal-side)
- `src/components/principal/LiveTeacherPresenceCard.tsx`

Edited:
- `src/components/teacher/MyScheduleWidget.tsx` — add the two round buttons on current period rows
- `src/pages/tenant/role-homes/PrincipalHome.tsx` — mount LiveTeacherPresenceCard
- `src/components/principal/PrincipalTeachersTab.tsx` — mount LiveTeacherPresenceCard at top

Migration:
- create `teacher_period_presence` table + RLS + realtime publication
