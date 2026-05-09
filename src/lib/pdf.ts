import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDate, fmtMoney } from "./format";

export type Settings = {
  tutor_name: string | null;
  business_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  account_holder: string | null;
  sort_code: string | null;
  account_number: string | null;
  payment_notes: string | null;
};

export type InvoiceForPdf = {
  invoice_number: string;
  invoice_title: string;
  invoice_date: string;
  payment_deadline: string | null;
  client_name: string;
  client_parent_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  notes: string | null;
  total: number;
  items: {
    lesson_date: string;
    description: string;
    duration: number;
    hourly_rate: number;
    amount: number;
  }[];
};

export function generateInvoicePdf(invoice: InvoiceForPdf, settings: Settings) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 50, 90);
  doc.text(settings.business_name || settings.tutor_name || "Tutor", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  const headerRight: string[] = [];
  if (settings.tutor_name && settings.business_name) headerRight.push(settings.tutor_name);
  if (settings.address) headerRight.push(...settings.address.split("\n"));
  if (settings.email) headerRight.push(settings.email);
  if (settings.phone) headerRight.push(settings.phone);
  headerRight.forEach((line, i) => {
    doc.text(line, pageW - margin, y - 8 + i * 12, { align: "right" });
  });

  y += 30;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // Invoice meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("INVOICE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageW - margin, y - 4, { align: "right" });
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, pageW - margin, y + 10, { align: "right" });
  if (invoice.payment_deadline) {
    doc.text(`Due: ${fmtDate(invoice.payment_deadline)}`, pageW - margin, y + 24, { align: "right" });
  }

  y += 30;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(invoice.invoice_title, margin, y);

  y += 24;

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text("Bill to", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  const billLines: string[] = [];
  if (invoice.client_parent_name) {
    billLines.push(invoice.client_parent_name);
    billLines.push(`(Student: ${invoice.client_name})`);
  } else {
    billLines.push(invoice.client_name);
  }
  if (invoice.client_address) billLines.push(...invoice.client_address.split("\n"));
  if (invoice.client_email) billLines.push(invoice.client_email);
  if (invoice.client_phone) billLines.push(invoice.client_phone);
  billLines.forEach((l, i) => doc.text(l, margin, y + i * 12));
  y += billLines.length * 12 + 18;

  // Lesson table
  autoTable(doc, {
    startY: y,
    head: [["Date", "Description", "Duration (h)", "Rate", "Amount"]],
    body: invoice.items.map((it) => [
      fmtDate(it.lesson_date),
      it.description,
      Number(it.duration).toString(),
      fmtMoney(Number(it.hourly_rate)),
      fmtMoney(Number(it.amount)),
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [70, 90, 160], textColor: 255 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 16;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text("Total due", pageW - margin - 110, y);
  doc.text(fmtMoney(Number(invoice.total)), pageW - margin, y, { align: "right" });
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("No VAT charged — not VAT registered.", pageW - margin, y, { align: "right" });
  y += 24;

  // Payment methods
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text("Ways to pay", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  const pay: string[] = [];
  if (settings.bank_name || settings.account_holder || settings.sort_code || settings.account_number) {
    pay.push("Bank transfer");
  }
  if (settings.bank_name) pay.push(`Bank: ${settings.bank_name}`);
  if (settings.account_holder) pay.push(`Account holder: ${settings.account_holder}`);
  if (settings.sort_code) pay.push(`Sort code / routing number: ${settings.sort_code}`);
  if (settings.account_number) pay.push(`Account number / IBAN: ${settings.account_number}`);
  if (settings.payment_notes) {
    pay.push(...settings.payment_notes.split("\n").filter(Boolean));
  }
  if (pay.length === 0) pay.push("(Add payment methods in Settings)");
  pay.forEach((l, i) => doc.text(l, margin, y + i * 12));
  y += pay.length * 12 + 18;

  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text("Notes", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    const wrapped = doc.splitTextToSize(invoice.notes, pageW - margin * 2);
    doc.text(wrapped, margin, y);
  }

  doc.save(`${invoice.invoice_title}.pdf`);
}
