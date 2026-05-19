import jsPDF from "jspdf";

export type VoucherBankDetails = {
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  branch?: string | null;
  swift?: string | null;
};

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
  bank?: VoucherBankDetails | null;
  footerNote?: string | null;
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

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function drawCopy(
  doc: jsPDF,
  data: VoucherCopyData,
  copyLabel: string,
  xOffset: number,
  copyWidth: number,
  accent: [number, number, number],
) {
  const accentDark = mix(accent, [0, 0, 0], 0.35);
  const accentSoft = mix(accent, [255, 255, 255], 0.88);
  const ink: [number, number, number] = [22, 22, 28];
  const muted: [number, number, number] = [110, 110, 120];
  const hairline: [number, number, number] = [220, 220, 228];

  const margin = 7;
  const left = xOffset + margin;
  const right = xOffset + copyWidth - margin;
  const innerW = copyWidth - margin * 2;

  // Outer card border
  doc.setDrawColor(hairline[0], hairline[1], hairline[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(xOffset + 2, 3, copyWidth - 4, 204, 2, 2, "S");

  // Gradient header (simulated with 14 horizontal slices)
  const headerH = 26;
  const slices = 18;
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const c = mix(accentDark, accent, t);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(xOffset + 2, 3 + (headerH * i) / slices, copyWidth - 4, headerH / slices + 0.2, "F");
  }

  // Copy label pill (top right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(right - 34, 6, 32, 5.5, 1.5, 1.5, "F");
  doc.setTextColor(accentDark[0], accentDark[1], accentDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(copyLabel.toUpperCase(), right - 18, 9.8, { align: "center" });

  // School identity
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.school.name, left, 12, { maxWidth: innerW - 38 });
  if (data.school.motto) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text(data.school.motto, left, 16, { maxWidth: innerW - 38 });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const contact = [data.school.address, data.school.phone, data.school.email, data.school.website]
    .filter(Boolean)
    .join("  •  ");
  if (contact) doc.text(contact, left, 21, { maxWidth: innerW });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("OFFICIAL FEE VOUCHER", left, 26);

  // Voucher meta strip
  let y = 32;
  doc.setFillColor(accentSoft[0], accentSoft[1], accentSoft[2]);
  doc.roundedRect(left, y, innerW, 11, 1.2, 1.2, "F");
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  const colW = innerW / 3;
  const metaCol = (idx: number, label: string, val: string) => {
    const cx = left + colW * idx + 2;
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), cx, y + 3.6);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(val, cx, y + 8.4, { maxWidth: colW - 4 });
  };
  metaCol(0, "Voucher #", data.invoiceNumber);
  metaCol(1, "Issue Date", data.issueDate);
  metaCol(2, "Due Date", data.dueDate);
  y += 13;

  // Student block
  doc.setDrawColor(hairline[0], hairline[1], hairline[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(left, y, innerW, 22, 1.2, 1.2, "S");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(left, y, 1.2, 22, "F");
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("STUDENT", left + 3, y + 3.5);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFontSize(9);
  doc.text(data.student.name, left + 3, y + 7.5, { maxWidth: innerW - 6 });

  const sRows: [string, string][] = [
    ["Class", `${data.student.className ?? "-"} ${data.student.sectionName ?? ""}`.trim()],
    ["Roll / ID", `${data.student.rollNumber ?? "-"} / ${data.student.studentCode ?? "-"}`],
    ["Parent", `${data.student.parentName ?? "-"}${data.student.parentPhone ? " · " + data.student.parentPhone : ""}`],
    ["Period", data.periodLabel ?? "-"],
  ];
  doc.setFontSize(6.5);
  let ry = y + 11;
  sRows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(k, left + 3, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(String(v), left + 18, ry, { maxWidth: innerW - 21 });
    ry += 2.7;
  });
  y += 24;

  // Items table header
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(left, y, innerW, 5.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("DESCRIPTION", left + 2, y + 3.8);
  doc.text(`AMOUNT (${data.currency})`, right - 2, y + 3.8, { align: "right" });
  y += 5.4;

  // Items rows
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  data.items.forEach((it, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 248, 252);
      doc.rect(left, y, innerW, 4.6, "F");
    }
    doc.text(it.label, left + 2, y + 3.2, { maxWidth: innerW - 32 });
    doc.text(fmt(it.amount), right - 2, y + 3.2, { align: "right" });
    y += 4.6;
  });

  // Subtotal/discount lines
  y += 1;
  doc.setDrawColor(hairline[0], hairline[1], hairline[2]);
  doc.line(left, y, right, y);
  y += 3.4;
  const sumRow = (label: string, val: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFontSize(6.5);
    doc.text(label, left + 2, y);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(fmt(val), right - 2, y, { align: "right" });
    y += 3.4;
  };
  sumRow("Subtotal", data.subtotal);
  if (data.baseDiscount > 0) sumRow("Base Discount", -data.baseDiscount);
  if (data.meritDiscount > 0)
    sumRow(`Merit Discount${data.meritReason ? " (" + data.meritReason + ")" : ""}`, -data.meritDiscount);
  if (data.siblingDiscount > 0) sumRow("Sibling Discount", -data.siblingDiscount);

  // Total band
  y += 1;
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const c = mix(accent, accentDark, t);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(left, y + (8 * i) / 10, innerW, 0.95, "F");
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TOTAL PAYABLE", left + 2, y + 5.4);
  doc.text(`${data.currency}  ${fmt(data.total)}`, right - 2, y + 5.4, { align: "right" });
  y += 10;

  // Bank details (if any)
  const bk = data.bank;
  if (bk && (bk.bankName || bk.accountNumber || bk.iban)) {
    doc.setFillColor(accentSoft[0], accentSoft[1], accentSoft[2]);
    doc.roundedRect(left, y, innerW, 16, 1, 1, "F");
    doc.setTextColor(accentDark[0], accentDark[1], accentDark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("PAY AT BANK", left + 2, y + 3);
    const bankLines: [string, string][] = [];
    if (bk.bankName) bankLines.push(["Bank", bk.bankName + (bk.branch ? " — " + bk.branch : "")]);
    if (bk.accountTitle) bankLines.push(["Title", bk.accountTitle]);
    if (bk.accountNumber) bankLines.push(["A/C #", bk.accountNumber]);
    if (bk.iban) bankLines.push(["IBAN", bk.iban]);
    if (bk.swift) bankLines.push(["SWIFT", bk.swift]);
    doc.setFontSize(6.2);
    let by = y + 6;
    bankLines.slice(0, 4).forEach(([k, v]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(k, left + 2, by);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.text(v, left + 14, by, { maxWidth: innerW - 16 });
      by += 2.5;
    });
    y += 17;
  }

  // Notes
  if (data.notes) {
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.8);
    doc.text(`Note: ${data.notes}`, left, y, { maxWidth: innerW });
    y += 4;
  }

  // Signature lines near bottom
  const sigY = 192;
  doc.setDrawColor(180, 180, 188);
  doc.setLineWidth(0.2);
  doc.line(left, sigY, left + innerW / 2 - 4, sigY);
  doc.line(left + innerW / 2 + 4, sigY, right, sigY);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.text("Authorised Signature", left, sigY + 3);
  doc.text("Received By (Cashier / Bank Stamp)", left + innerW / 2 + 4, sigY + 3);

  // Footer
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "italic");
  const foot = data.footerNote || "Please pay before due date. A late fee may apply for overdue payments.";
  doc.text(foot, left, 200, { maxWidth: innerW });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text("Powered by Altrix", right, 204, { align: "right" });
}

function drawVoucherOnDoc(doc: jsPDF, data: VoucherCopyData) {
  const accent = data.accentHsl
    ? hslToRgb(data.accentHsl.h, data.accentHsl.s, data.accentHsl.l)
    : ([35, 96, 178] as [number, number, number]);
  const copyW = 297 / 3;
  ["Student Copy", "Bank Copy", "Office Copy"].forEach((label, i) => {
    drawCopy(doc, data, label, copyW * i, copyW, accent);
    if (i < 2) {
      doc.setDrawColor(170, 170, 180);
      doc.setLineDashPattern([1.2, 1.2], 0);
      doc.line(copyW * (i + 1), 4, copyW * (i + 1), 206);
      doc.setLineDashPattern([], 0);
    }
  });
}

export function generateVoucherPdf(data: VoucherCopyData): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  drawVoucherOnDoc(doc, data);
  return doc;
}

export function appendVoucherPage(doc: jsPDF, data: VoucherCopyData) {
  doc.addPage("a4", "landscape");
  drawVoucherOnDoc(doc, data);
}
