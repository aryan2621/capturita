import { LEGAL_NAME, SUPPORT_EMAIL } from "./config";

export interface Receipt { order_id: string; payment_id: string | null; email: string; name: string | null; amount_paise: number; currency: string; paid_at: number }

// shortcut: a hand-written one-page text PDF (built-in Helvetica, Latin-1 only), so no PDF library ships; upgrade if the receipt needs a logo or non-Latin names.
const pdfText = (s: string) => s.replace(/[^\x20-\x7e]/g, "?").replace(/[\\()]/g, "\\$&");

export function receiptPdf(r: Receipt): Blob {
  const date = new Date(r.paid_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const amount = `${r.currency === "INR" ? "Rs " : r.currency + " "}${(r.amount_paise / 100).toLocaleString("en-IN")}`;
  const rows: [string, string][] = [
    ["Receipt for", r.name ? `${r.name} (${r.email})` : r.email],
    ["Date", date],
    ["Item", "Capturita Pro, one license with one year of updates"],
    ["Amount paid", amount],
    ["Order", r.order_id],
    ["Payment", r.payment_id ?? "-"],
  ];
  const line = (font: string, size: number, x: number, y: number, t: string) => `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(t)}) Tj ET`;
  const content = [
    line("F2", 22, 56, 770, "Capturita receipt"),
    line("F1", 10, 56, 750, `Sold by ${LEGAL_NAME}. Questions: ${SUPPORT_EMAIL}`),
    ...rows.flatMap(([k, v], i) => [line("F1", 11, 56, 700 - i * 30, k), line("F2", 11, 170, 700 - i * 30, v)]),
    line("F1", 10, 56, 700 - rows.length * 30 - 10, "This is a payment receipt, not a tax invoice."),
  ].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export const receiptUrl = (r: Receipt) => URL.createObjectURL(receiptPdf(r));
