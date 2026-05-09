import { fmtDate, fmtMoney } from "@/lib/format";
import type { Settings, InvoiceForPdf } from "@/lib/pdf";

export function InvoicePreview({
  invoice,
  settings,
}: {
  invoice: InvoiceForPdf;
  settings: Partial<Settings>;
}) {
  const s = settings || {};
  return (
    <div className="bg-white text-slate-900 rounded-md border shadow-sm mx-auto w-full max-w-[800px] p-8 sm:p-10 text-sm font-sans">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {s.business_name || s.tutor_name || "Tutor"}
          </h2>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          {s.business_name && s.tutor_name && <div>{s.tutor_name}</div>}
          {s.address?.split("\n").map((l, i) => <div key={i}>{l}</div>)}
          {s.email && <div>{s.email}</div>}
          {s.phone && <div>{s.phone}</div>}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-start justify-between gap-4 mt-6">
        <h3 className="text-lg font-bold tracking-wide">INVOICE</h3>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          <div><span className="font-medium text-slate-700">Invoice #:</span> {invoice.invoice_number}</div>
          <div><span className="font-medium text-slate-700">Date:</span> {fmtDate(invoice.invoice_date)}</div>
          {invoice.payment_deadline && (
            <div><span className="font-medium text-slate-700">Due:</span> {fmtDate(invoice.payment_deadline)}</div>
          )}
        </div>
      </div>
      <div className="text-[11px] text-slate-500 mt-1 break-all">{invoice.invoice_title}</div>

      {/* Bill to */}
      <div className="mt-6">
        <div className="font-semibold text-slate-800 mb-1">Bill to</div>
        <div className="text-xs text-slate-600 space-y-0.5">
          {invoice.client_parent_name ? (
            <>
              <div>{invoice.client_parent_name}</div>
              <div className="text-slate-500">(Student: {invoice.client_name})</div>
            </>
          ) : (
            <div>{invoice.client_name}</div>
          )}
          {invoice.client_address?.split("\n").map((l, i) => <div key={i}>{l}</div>)}
          {invoice.client_email && <div>{invoice.client_email}</div>}
          {invoice.client_phone && <div>{invoice.client_phone}</div>}
        </div>
      </div>

      {/* Lessons table */}
      <table className="w-full mt-6 text-xs border-collapse">
        <thead>
          <tr className="bg-[rgb(70,90,160)] text-white">
            <th className="text-left p-2 font-semibold">Date</th>
            <th className="text-left p-2 font-semibold">Description</th>
            <th className="text-right p-2 font-semibold">Hours</th>
            <th className="text-right p-2 font-semibold">Rate</th>
            <th className="text-right p-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 && (
            <tr><td colSpan={5} className="p-3 text-center text-slate-400 border">No lessons added</td></tr>
          )}
          {invoice.items.map((it, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{fmtDate(it.lesson_date)}</td>
              <td className="p-2">{it.description}</td>
              <td className="p-2 text-right tabular-nums">{Number(it.duration)}</td>
              <td className="p-2 text-right tabular-nums">{fmtMoney(Number(it.hourly_rate))}</td>
              <td className="p-2 text-right tabular-nums">{fmtMoney(Number(it.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mt-4">
        <div className="text-right">
          <div className="flex gap-8 items-baseline">
            <span className="font-semibold text-slate-800">Total due</span>
            <span className="font-bold text-base tabular-nums">{fmtMoney(Number(invoice.total))}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">No VAT charged — not VAT registered.</div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="mt-6">
        <div className="font-semibold text-slate-800 mb-1">Ways to pay</div>
        <div className="text-xs text-slate-600 space-y-0.5">
          {(s.bank_name || s.account_holder || s.sort_code || s.account_number) && (
            <div className="font-medium text-slate-700">Bank transfer</div>
          )}
          {s.bank_name && <div>Bank: {s.bank_name}</div>}
          {s.account_holder && <div>Account holder: {s.account_holder}</div>}
          {s.sort_code && <div>Sort code / routing number: {s.sort_code}</div>}
          {s.account_number && <div>Account number / IBAN: {s.account_number}</div>}
          {s.payment_notes?.split("\n").filter(Boolean).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {!s.bank_name && !s.account_holder && !s.sort_code && !s.account_number && !s.payment_notes && (
            <div className="italic text-slate-400">(Add payment methods in Settings)</div>
          )}
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-6">
          <div className="font-semibold text-slate-800 mb-1">Notes</div>
          <div className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.notes}</div>
        </div>
      )}
    </div>
  );
}
