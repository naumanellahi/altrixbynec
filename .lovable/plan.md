# HR Manager Shell — Full Overhaul Plan

## Goal
Turn the HR shell into a complete, professional HR system with every tab fully functional and synced to real backend data. Remove unrelated tabs, deepen thin ones, add modern HR features.

## Final tab list

Kept & enhanced (12):
1. **Dashboard** — real KPIs, headcount/turnover/leave trends, pending approvals, upcoming reviews/contract expiries, quick actions
2. **Staff Directory** (was Staff & Users) — list, filters, profile drawer with full HR record, deactivate/reactivate, role changes, search/export
3. **Recruitment** *(new)* — job postings, applicant pipeline (applied → screen → interview → offer → hired/rejected), interview scheduling, offer letters
4. **Onboarding** *(new)* — per-new-hire checklist templates, asset issue, document collection, training assignments, progress tracking
5. **Offboarding** *(new)* — exit checklist, asset return, final settlement trigger, exit interview notes
6. **Attendance** — read+manage staff attendance (clock-in/out, biometric import CSV, monthly grid, regularization requests)
7. **Leave Management** — types, balances per employee, applications inbox with approve/reject, leave calendar view, year-end carry-forward
8. **Payroll Runs** *(new)* — monthly run: generate → review → approve → mark paid → payslip PDF; includes deductions/allowances/tax/bonuses
9. **Salaries** — salary structures, components (basic/HRA/allowances/deductions), per-employee assignment (feeds Payroll)
10. **Contracts** — create/renew/terminate, expiry alerts, e-sign upload, templates
11. **Performance Reviews** — review cycles, KPIs/goals, self + manager review, ratings history
12. **Documents** — employee document vault (CNIC, degrees, contracts) with expiry, secure storage bucket
13. **HR Analytics** *(new)* — headcount by department/role, turnover %, attendance %, leave utilization, salary cost trend, gender ratio; CSV/PDF export
14. **Notices** — kept (HR-wide announcements to staff)
15. **Holidays** — kept (school calendar; HR owns publishing)
16. **Support Inbox** — staff HR queries with thread, status, assignment
17. **Messages** — kept

Removed: **Timetable Builder**, **Fee Vouchers** (moved out of HR shell — they remain available to their proper roles).

## Database additions (additive only)

New tables (each with `school_id`, RLS via `can_manage_hr`/`is_school_member`, full GRANTs):

- `hr_job_postings` — title, dept, location, type, status (draft/open/closed), description, openings, posted_at
- `hr_applicants` — name, email, phone, posting_id, stage, resume_url, rating, notes
- `hr_interviews` — applicant_id, scheduled_at, interviewer_user_id, mode, status, feedback
- `hr_onboarding_templates` + `hr_onboarding_tasks_template` — reusable checklists
- `hr_onboarding_assignments` + `hr_onboarding_task_status` — per-hire progress
- `hr_offboarding_assignments` + `hr_offboarding_task_status`
- `hr_assets` (asset registry) + `hr_asset_assignments` (issued/returned)
- `hr_salary_components` (earning/deduction, formula type) + `hr_employee_salary_structure`
- `hr_payroll_runs` (period, status: draft/locked/paid) + `hr_payslips` (per employee, gross/net/tax/deductions JSON)
- `hr_attendance_regularizations` (request → approve/reject)
- `hr_performance_cycles` + `hr_performance_reviews` (extends current reviews)

Reuse existing: `hr_leave_types`, leave applications, current attendance, current salaries, documents, notices, holidays, support, messages tables.

## Frontend work

- `src/components/tenant/HrShell.tsx` — new nav list, remove Timetable/Fee Vouchers, add 4 new entries grouped (People / Workforce / Payroll / Reports).
- `src/pages/tenant/HrDashboard.tsx` — register new routes, drop removed ones.
- Rewrite every `src/pages/tenant/hr-modules/*Module.tsx`:
  - Real data queries with `useEffect` + `JSON.stringify` dep stability
  - Filters (campus/department/status), search, pagination, CSV export
  - Dialogs guarded by `perms.loading`, Enter-key submits work via global handler
  - All HSL semantic tokens — no raw colors
  - Empty + loading + error states
- New modules added: `HrRecruitmentModule.tsx`, `HrOnboardingModule.tsx`, `HrOffboardingModule.tsx`, `HrPayrollModule.tsx`, `HrAnalyticsModule.tsx`
- `HrHomeModule.tsx` rebuilt: KPI cards (live counts), pending-approvals list, contract-expiry alerts, upcoming reviews, recent hires, quick-action buttons → all clickable to routes.

## Execution order (one PR-style batch per phase)

Because of the size, I'll deliver in 4 phases. Each phase ends with a working build:

1. **Phase 1 — DB + Shell rewire**: migrations for all new tables, update `HrShell.tsx` + `HrDashboard.tsx` routes, rebuild `HrHomeModule` dashboard.
2. **Phase 2 — People modules**: Staff Directory, Recruitment, Onboarding, Offboarding.
3. **Phase 3 — Workforce/Payroll**: Attendance (with regularizations), Leaves (enhanced), Salaries (components), Payroll Runs, Contracts, Reviews, Documents.
4. **Phase 4 — Comms + Analytics**: Notices/Holidays polish, Support Inbox real threading, Messages polish, HR Analytics.

After your approval I'll start Phase 1 immediately (DB migration first — you'll get an approval prompt for it — then the shell + dashboard code).

## Technical notes
- All policies follow project convention: `can_manage_hr(school_id)` for write, `is_school_member` for read where appropriate. Sensitive payroll tables: only `can_manage_finance` or `can_manage_hr`.
- No destructive DB changes; everything additive — existing modules keep working during the rewrite.
- Storage buckets: reuse `hr-documents` if present, else create private `hr-documents` and `hr-resumes`.
- PDF/CSV export via existing `jsPDF` + simple CSV helpers already in repo.
