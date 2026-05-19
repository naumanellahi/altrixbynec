import jsPDF from "jspdf";

export type VoucherCopyData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  periodLabel?: string | null;
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    motto?: string | null;
  };
  student: {
    name: string;
    rollNumber?: string | null;
    studentCode?: string | null;
    className?: string | null;
    sectionName?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
  };
  items: { label: string; amount: number }[];
  subtotal: number;
  baseDiscount: number;
  meritDiscount: number;
  meritReason?: string | null;
  siblingDiscount: number;
  total: number;
  currency: string;
  accentHsl?: { h: number; s: number; l: number } | null;
  notes?: string | null;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function drawCopy(
  doc: jsPDF,
  data: VoucherCopyData,
  copyLabel: string,
  xOffset: number,
  copyWidth: number,
  accent: [number, number, number],
) {
  const margin = 8;
  let y = 12;
  const left = xOffset + margin;
  const right = xOffset + copyWidth - margin;
  const innerW = copyWidth - margin * 2;

  // Header band
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(xOffset, 0, copyWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.school.name, left, 10, { maxWidth: innerW });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const meta = [data.school.address, data.school.phone, data.school.email].filter(Boolean).join(" • ");
  if (meta) doc.text(meta, left, 15, { maxWidth: innerW });
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(copyLabel.toUpperCase(), right, 19, { align: "right" });

  // Voucher number / dates
  y = 28;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FEE VOUCHER", left, y);
  doc.setFont("helvetica", "normal");
  doc.text(`# ${data.invoiceNumber}`, right, y, { align: "right" });

  y += 4;
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.line(left, y, right, y);

  // Student block
  y += 5;
  doc.setFontSize(7);
  const rows: [string, string][] = [
    ["Student", data.student.name],
    ["Roll / ID", `${data.student.rollNumber ?? "-"} / ${data.student.studentCode ?? "-"}`],
    ["Class", `${data.student.className ?? "-"} ${data.student.sectionName ?? ""}`.trim()],
    ["Parent", `${data.student.parentName ?? "-"}${data.student.parentPhone ? " (" + data.student.parentPhone + ")" : ""}`],
    ["Period", data.periodLabel ?? "-"],
    ["Issue Date", data.issueDate],
    ["Due Date", data.dueDate],
  ];
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, left, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), left + 20, y, { maxWidth: innerW - 22 });
    y += 4;
  });

  // Items table
  y += 2;
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(left, y, innerW, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Description", left + 2, y + 3.5);
  doc.text(`Amount (${data.currency})`, right - 2, y + 3.5, { align: "right" });
  y += 5;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  data.items.forEach((it, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(245, 245, 250);
      doc.rect(left, y, innerW, 4.5, "F");
    }
    doc.text(it.label, left + 2, y + 3.2, { maxWidth: innerW - 30 });
    doc.text(fmt(it.amount), right - 2, y + 3.2, { align: "right" });
    y += 4.5;
  });

  // Totals
  y += 1;
  doc.setDrawColor(200, 200, 210);
  doc.line(left, y, right, y);
  y += 4;
  const totalRow = (label: string, val: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, left + 2, y);
    doc.text(fmt(val), right - 2, y, { align: "right" });
    y += 4;
  };
  totalRow("Subtotal", data.subtotal);
  if (data.baseDiscount > 0) totalRow("Base Discount", -data.baseDiscount);
  if (data.meritDiscount > 0)
    totalRow(`Merit Discount${data.meritReason ? " (" + data.meritReason + ")" : ""}`, -data.meritDiscount);
  if (data.siblingDiscount > 0) totalRow("Sibling Discount", -data.siblingDiscount);

  // Total band
  y += 1;
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(left, y, innerW, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL PAYABLE", left + 2, y + 4.2);
  doc.text(`${data.currency} ${fmt(data.total)}`, right - 2, y + 4.2, { align: "right" });
  y += 8;

  // Footer
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.text(
    "Pay before due date. A late fee may apply for overdue payments.",
    left,
    y,
    { maxWidth: innerW },
  );
  y += 3;
  if (data.notes) {
    doc.text(`Note: ${data.notes}`, left, y, { maxWidth: innerW });
    y += 3;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Powered by Altrix", left, 205, { maxWidth: innerW });
}

export function generateVoucherPdf(data: VoucherCopyData): jsPDF {
  // Landscape A4: 297 x 210 mm, three copies side-by-side
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const accent = data.accentHsl
    ? hslToRgb(data.accentHsl.h, data.accentHsl.s, data.accentHsl.l)
    : ([35, 96, 178] as [number, number, number]);
  const copyW = 297 / 3;
  ["Student Copy", "Bank Copy", "Office Copy"].forEach((label, i) => {
    drawCopy(doc, data, label, copyW * i, copyW, accent);
    if (i < 2) {
      doc.setDrawColor(150, 150, 160);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(copyW * (i + 1), 0, copyW * (i + 1), 210);
      doc.setLineDashPattern([], 0);
    }
  });
  return doc;
}
