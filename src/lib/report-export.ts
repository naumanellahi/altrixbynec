// Centralised report export helpers for the Accountant shell.
// Supports CSV, Excel (.xls via HTML), JSON, Print, and Print-to-PDF
// using the browser's native print dialog (zero extra deps).

import { toCsv } from "@/lib/csv";

export type ExportRow = Record<string, string | number | null | undefined>;

const ts = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function exportCSV(rows: ExportRow[], baseName: string) {
  const csv = toCsv(rows);
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${baseName}-${ts()}.csv`);
}

export function exportJSON(rows: ExportRow[], baseName: string) {
  const json = JSON.stringify(rows, null, 2);
  triggerDownload(new Blob([json], { type: "application/json;charset=utf-8;" }), `${baseName}-${ts()}.json`);
}

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function rowsToHtmlTable(rows: ExportRow[], title: string): string {
  if (!rows.length) {
    return `<table><thead><tr><th>${escapeHtml(title)}</th></tr></thead><tbody><tr><td>No data</td></tr></tbody></table>`;
  }
  const keys = Object.keys(rows[0]);
  const header = keys.map((k) => `<th>${escapeHtml(k.replace(/_/g, " "))}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${keys.map((k) => `<td>${escapeHtml(r[k])}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Export to a .xls file Excel can open (Excel-compatible HTML). */
export function exportExcel(rows: ExportRow[], baseName: string, title?: string) {
  const table = rowsToHtmlTable(rows, title ?? baseName);
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<style>
  table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}
  th,td{border:1px solid #999;padding:6px 10px;text-align:left}
  th{background:#f3f4f6;font-weight:bold}
</style></head><body><h3>${escapeHtml(title ?? baseName)}</h3>${table}</body></html>`;
  triggerDownload(
    new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    `${baseName}-${ts()}.xls`,
  );
}

export interface PrintOptions {
  title: string;
  subtitle?: string;
  rows: ExportRow[];
  /** Optional summary key/value pairs rendered above the table. */
  summary?: Array<{ label: string; value: string | number }>;
  /** Optional pre-rendered HTML inserted between summary and table. */
  extraHtml?: string;
  /** School/brand name printed in the header. */
  schoolName?: string;
}

export function printReport(opts: PrintOptions) {
  const { title, subtitle, rows, summary, extraHtml, schoolName } = opts;
  const table = rowsToHtmlTable(rows, title);
  const summaryHtml = summary?.length
    ? `<div class="summary">${summary
        .map(
          (s) =>
            `<div class="summary-item"><div class="lbl">${escapeHtml(s.label)}</div><div class="val">${escapeHtml(s.value)}</div></div>`,
        )
        .join("")}</div>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111;margin:32px;}
  .brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
  .brand h1{margin:0;font-size:22px}
  .brand .meta{font-size:11px;color:#555;text-align:right}
  h2.subtitle{font-size:14px;color:#555;margin:0 0 14px;font-weight:500}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 18px}
  .summary-item{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px}
  .summary-item .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
  .summary-item .val{font-size:16px;font-weight:700;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
  tbody tr:nth-child(even){background:#fafafa}
  .footer{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:10px;color:#6b7280;display:flex;justify-content:space-between}
  @media print{ body{margin:14mm} .no-print{display:none} }
  @page{size:A4;margin:14mm}
</style></head><body>
  <div class="brand">
    <div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<h2 class="subtitle">${escapeHtml(subtitle)}</h2>` : ""}
    </div>
    <div class="meta">
      ${schoolName ? `<div><strong>${escapeHtml(schoolName)}</strong></div>` : ""}
      <div>Generated ${new Date().toLocaleString()}</div>
    </div>
  </div>
  ${summaryHtml}
  ${extraHtml ?? ""}
  ${table}
  <div class="footer"><span>${escapeHtml(schoolName ?? "")}</span><span>${rows.length} record${rows.length === 1 ? "" : "s"}</span></div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)};window.onafterprint=function(){window.close()};</script>
</body></html>`;

  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) {
    // Fallback: blob URL
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Print + saves to PDF via the browser's native "Save as PDF" destination. */
export const exportPDF = (opts: PrintOptions) => printReport(opts);
