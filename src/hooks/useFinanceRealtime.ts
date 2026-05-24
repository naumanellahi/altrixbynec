import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to every finance-related table for the given school and
 * invalidates the matching react-query caches so every accountant tab
 * stays in sync with the database in realtime.
 */
const FINANCE_TABLES: Array<{ table: string; keys: string[] }> = [
  { table: "fee_invoices", keys: ["fee_invoices", "proof_invoices", "accountant_invoices", "voucher_invoices", "accountant_home"] },
  { table: "fee_payments", keys: ["fee_payments", "accountant_payments", "accountant_home"] },
  { table: "fee_payment_proofs", keys: ["fee_payment_proofs", "accountant_home"] },
  { table: "fee_plans", keys: ["fee_plans", "accountant_home"] },
  { table: "fee_plan_items", keys: ["fee_plan_items"] },
  { table: "fee_plan_installments", keys: ["fee_plan_installments"] },
  { table: "fee_voucher_batches", keys: ["fee_voucher_batches", "accountant_home"] },
  { table: "fee_voucher_deliveries", keys: ["fee_voucher_deliveries"] },
  { table: "expenses", keys: ["expenses", "accountant_expenses", "accountant_home"] },
  { table: "payroll_runs", keys: ["payroll_runs", "accountant_payroll", "accountant_home"] },
  { table: "payroll_items", keys: ["payroll_items", "accountant_payroll"] },
];

export function useFinanceRealtime(schoolId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!schoolId) return;
    const channels: RealtimeChannel[] = [];
    for (const { table, keys } of FINANCE_TABLES) {
      const ch = supabase
        .channel(`finance-rt-${table}-${schoolId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `school_id=eq.${schoolId}` },
          () => {
            keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
            // Also invalidate the school-scoped variant if present
            keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, schoolId] }));
          },
        )
        .subscribe();
      channels.push(ch);
    }
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [schoolId, qc]);
}
