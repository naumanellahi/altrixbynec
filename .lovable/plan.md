# Enhanced Fee Voucher System

Build a comprehensive fee voucher generator accessible to **School Admin, Super Admin, HR, Accountant, and Principal** roles, with professional university-style PDFs and automatic parent delivery.

## 1. Access & Entry Point

Add a new module **"Fee Vouchers"** visible to: `super_admin`, `school_owner`, `principal`, `vice_principal`, `school_admin`, `accountant`, `hr_manager`.

Entry from existing dashboards (Principal, Accountant, HR, Owner). Route: `/:schoolSlug/:role/fee-vouchers`.

## 2. Voucher Generation Modes

A single dialog with three tabs:

**a) Individual Student**
- Select class → section → student
- Pick fee plan (or build line items ad-hoc)
- Period label, issue date, due date
- Manual discount (% or fixed) + reason
- Scholarship amount
- Notes

**b) Whole Class / Section**
- Select class → section (or "all sections of class")
- Pick fee plan
- Period label, due date
- Default discount (% or fixed) applied to everyone
- **Grade-based bonus discount** (new): "If student's latest avg grade ≥ X%, apply Y% extra discount." Multiple tiers supported (e.g., ≥90% → 15%, ≥80% → 10%).
- Preview table shows per-student computed totals before confirming.

**c) Bulk Custom**
- Same as whole class but with per-student override grid.

## 3. Grade-Based Discount Logic

Use existing `student_marks` + `academic_assessments` to compute each student's average % over the last 90 days. Apply highest matching tier. Sibling discount continues to stack via `student_sibling_rank`.

## 4. Professional Voucher PDF

Generate via `jsPDF` (already used elsewhere) — official university style:

```text
┌──────────────────────────────────────────────────┐
│  [LOGO]   SCHOOL NAME                Voucher #   │
│           Address • Phone • Email    Issue Date  │
├──────────────────────────────────────────────────┤
│  STUDENT COPY        |    BANK COPY    |  OFFICE │
│  Student: ...        Roll: ...   Class: ...      │
│  Father: ...         Parent Ph: ...              │
│  Period: Jan 2026    Due: 15-Jan-2026            │
├──────────────────────────────────────────────────┤
│  #  Description              Amount              │
│  1  Tuition Fee              25,000              │
│  2  Lab Fee                   2,500              │
│     Subtotal                 27,500              │
│     Discount (Merit 10%)     -2,750              │
│     Sibling Discount         -1,375              │
│     ─────────────────────────────────            │
│     TOTAL PAYABLE            23,375              │
├──────────────────────────────────────────────────┤
│  Pay before due date. Late fee Rs. 500/day.      │
│  [Branding footer • Powered by Altrix]           │
└──────────────────────────────────────────────────┘
```
Three identical copies on one page (Student / Bank / Office). Uses `school_branding` colors + `logo_url`.

## 5. Auto-Delivery to Parents

When a voucher is generated:
1. Insert into `fee_invoices` (existing table) — uses existing `generate_invoice_for_student` flow, extended to accept extra discount params.
2. Upload generated PDF to a new private storage bucket `fee-vouchers/{school_id}/{invoice_id}.pdf`.
3. Insert a `notifications` row for every linked guardian (`student_guardians.user_id`) with title "New Fee Voucher", body with amount + due date, and link to download.
4. If parent has no app account, fall back to email via existing `eduverse-invite` infra (only if email present).

Bulk operations run server-side in a new edge function `generate-fee-vouchers` so generation + notify happens atomically per student with progress feedback.

## 6. Database Changes (additive only)

- New table `fee_voucher_batches` — tracks bulk runs (school_id, created_by, class_section_id, fee_plan_id, period_label, due_date, default_discount_pct, grade_discount_tiers jsonb, status, totals).
- New table `fee_voucher_batch_items` — per-student row referencing `fee_invoices.id`, with `applied_grade_tier`, `applied_discount_pct`, `notified_at`.
- Extend `fee_invoices` with nullable: `merit_discount_amount numeric`, `merit_discount_reason text`, `pdf_storage_path text`.
- New storage bucket `fee-vouchers` (private).
- RLS: only finance/admin roles can insert/select batches; parents can SELECT their own children's invoices (already exists).

## 7. UI Components (new)

- `src/pages/tenant/modules/FeeVouchersModule.tsx` — list of batches + invoices, "Generate Voucher" button.
- `src/components/fees/GenerateVoucherDialog.tsx` — 3-tab wizard with live preview.
- `src/components/fees/GradeDiscountTiersEditor.tsx` — add/remove tier rows.
- `src/components/fees/VoucherPreviewTable.tsx` — per-student computed amounts.
- `src/lib/fee-voucher-pdf.ts` — PDF generator (jsPDF).
- `src/hooks/useFeeVouchers.ts` — React Query hooks.

## 8. Edge Function

`supabase/functions/generate-fee-vouchers/index.ts`
- Auth: verify JWT, check role via `can_manage_finance`.
- Input: mode (individual/class), params, grade tiers.
- For each student: compute discounts → call `generate_invoice_for_student` (extended) → render PDF (server-side via `pdf-lib` from npm) → upload to bucket → insert notification rows.
- Returns batch_id + per-student results.

## 9. Wiring

- Add module entry to `TenantDashboard.tsx` for the listed roles.
- Add nav link in each role shell (`AccountantShell`, `HrShell`, `OwnerShell`, principal section).

## Technical Notes

- Reuse existing `fee_plans`, `fee_plan_items`, `fee_invoices`, `student_fee_assignments`, `notifications`, `school_branding`.
- Strictly additive DB changes per project rule.
- Realtime: subscribe to `fee_voucher_batches` for progress UI.
- Parent dashboard already lists `fee_invoices` — they'll see new vouchers immediately; we also push a notification.

---

This is a sizable build (DB migration + edge function + ~6 new frontend files + nav wiring). Approve the plan and I'll implement it end-to-end, starting with the migration.
