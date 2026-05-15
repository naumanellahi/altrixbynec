
# Multi-School + Multi-Campus Owner Enhancement

You picked the heaviest options on every axis: two-level switcher, full RLS enforcement, and enhancing the admin school-creation flow. That is genuinely a lot of change across DB, edge functions, and UI. To keep things shippable and reviewable, I'll do it in 5 phases. Phases 1–3 are the core; 4–5 are polish and admin flow.

I will **not** create a new Owner dashboard or shell. All work happens inside `OwnerShell.tsx`, `OwnerDashboard.tsx`, and the existing 14 owner modules.

---

## Phase 1 — Data model & active-context plumbing

**DB migration (additive only):**
- New table `school_owner_assignments(id, owner_user_id, school_id, created_at, created_by)` — lets one owner manage many schools cleanly. Backfilled from existing `user_roles` rows where role = `school_owner`.
- New table `owner_active_context(user_id PK, active_school_id, active_campus_id, updated_at)` — persists the switcher selection per owner across devices.
- Helper RPCs:
  - `owner_schools()` — returns all schools the current user owns (or all, if platform super admin).
  - `owner_campuses(_school_id)` — returns campuses for a school.
  - `is_campus_member(_user_id, _campus_id)` — used by Phase 3 RLS.
- RLS: owner can read/write only their own row in `owner_active_context`; `school_owner_assignments` readable by owner + platform admin.

**Frontend context:**
- New `ActiveOwnerContext` provider (mounted inside `OwnerDashboard`) exposing `{schools, campuses, activeSchoolId, activeCampusId, setSchool, setCampus}`.
- Persists to `owner_active_context` and to `localStorage` for instant boot.

---

## Phase 2 — Switcher UI inside existing Owner shell

Edit `OwnerShell.tsx` only — no new shells.

- New `<OwnerContextSwitcher>` mounted in the existing header (desktop + mobile), next to the notifications bell.
- Two-level popover:
  - **School** dropdown (with logo, name, slug). Selecting navigates to `/<newSlug>/school_owner` and updates `active_school_id`.
  - **Campus** dropdown (filtered to active school). Selecting updates `active_campus_id` only — no navigation. Includes "All campuses" sentinel `__all`.
- Header pill shows `SchoolName · CampusName` and is clickable to open the switcher.

---

## Phase 3 — Campus isolation (data + RLS)

This is the heavy part. Done in waves so each migration is reviewable.

**Wave A — Backfill campus_id where logically derivable:**
- `students.campus_id` already exists; backfill from `class_sections.campus_id` via current enrollment when null.
- Add nullable `campus_id` to: `attendance_entries`, `attendance_sessions`, `fee_invoices`, `fee_payments`, `academic_assessments`, `student_marks`, `assignments`, `behavior_notes`, `complaints`, `app_notifications`, `admin_messages`, `report_cards`. Backfill from related student/section.
- Triggers to auto-populate `campus_id` on insert from related student/section so future writes never miss it.

**Wave B — RLS additions (additive, never removes existing policies):**
- New `is_campus_member(user, campus_id)` checks `staff_campus_assignments` OR `students.campus_id` for the user's children OR owner-of-school short-circuit.
- For each table above, add an additional restrictive-style policy gate: if `campus_id IS NOT NULL`, viewer must be a member of that campus OR a school-level admin/owner. Existing school-level policies remain so nothing breaks for unscoped data.
- Owner is treated as having access to all campuses of their schools (no extra friction at owner level).

**Wave C — Frontend filter:**
- `useActiveOwnerContext()` exposes `campusFilter` helper. Every owner module's queries get `.eq('campus_id', activeCampusId)` when not `__all`.

---

## Phase 4 — Owner module enhancements

Inside existing modules only. No new dashboards. Each gets:
- Hooked to active school + campus context (auto-refetch on change via React Query keys including both ids).
- Owner Overview: KPI grid (campuses, students, staff, revenue, dues, attendance %), monthly revenue chart, campus-comparison bar chart, recent activity feed.
- OwnerFinanceModule: campus-wise revenue breakdown table, combined vs per-campus toggle, monthly collections trend.
- OwnerAcademicsModule: enrollment growth + attendance trends per campus.
- OwnerHrModule: principal/teacher counts per campus.
- OwnerCampusesModule: real campus list with create/edit, principal assignment, status, KPIs per campus (replaces current placeholder).
- OwnerWellbeing/Compliance/Security/Brand: complete the placeholder cards with real queries scoped to active context.
- OwnerMessagesModule: pass `campusScope` so global-vs-campus announcements work.

All charts use existing recharts setup; all cards use existing `<Card>` + `bg-surface` tokens. No new design language.

---

## Phase 5 — Super Admin owner-assignment flow

- Edge function `eduverse-admin-create-school` (and the Platform Schools page UI) gets a new "Owner" picker:
  - Tab 1: **Existing owner** — searchable combobox listing users with `school_owner` role anywhere, plus any user by email lookup.
  - Tab 2: **New owner** — current create-user flow.
- On submit, function inserts into `school_owner_assignments` and `user_roles` for the new school. Idempotent; safe to re-link.
- Platform Schools page shows owner avatar/name per school and a "Reassign owner" action.

---

## Out of scope (explicit)

- No redesign of the Owner shell visual language. Existing tokens and layout stay.
- No changes to non-owner shells (Teacher/Parent/etc.) beyond the additive RLS — their existing policies keep working.
- No removal of any existing column, policy, table, or route.

---

## Technical details

- Migrations are split per phase/wave so each is small enough to review and roll back individually.
- All new RLS policies are **additive** — they layer on top of existing school-membership policies. Existing queries continue to work.
- Active-context state lives in DB (cross-device) with `localStorage` mirror for instant boot, matching the existing `useTenantOptimized` cache pattern.
- React Query keys for all owner modules become `[moduleKey, schoolId, campusId]` so switching campus invalidates correctly without a page reload.
- Memory `mem://features/multi-campus-management` will be updated with the new `campus_id` propagation rules and `is_campus_member` helper.

---

## Suggested execution order in this turn

If you approve, I'll start with **Phase 1 + Phase 2** in this turn (DB migration + switcher UI wired to context) so you can see and use the switcher immediately. Phases 3–5 follow in subsequent turns since each involves its own migration + edge-function deploy that you'll want to review separately.
