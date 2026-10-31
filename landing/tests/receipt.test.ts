import { expect, test } from "vitest";
import { writeFileSync } from "node:fs";
import { receiptPdf } from "../src/receipt";

test("receipt is a well-formed PDF with a correct xref table", async () => {
  const r = { order_id: "ord_1", payment_id: "pay_X(1)", email: "buyer@example.com", name: "Test Customer", amount_paise: 99900, currency: "INR", paid_at: 1761800000 };
  const text = Buffer.from(await receiptPdf(r).arrayBuffer()).toString("latin1");
  if (process.env.RECEIPT_OUT) writeFileSync(process.env.RECEIPT_OUT, text, "latin1");
  expect(text.startsWith("%PDF-1.4")).toBe(true);
  expect(text.endsWith("%%EOF")).toBe(true);
  expect(text).toContain("Rs 999");
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  expect(text.slice(xref, xref + 4)).toBe("xref");
  for (const m of text.matchAll(/(\d{10}) 00000 n/g)) expect(text.slice(Number(m[1]))).toMatch(/^\d+ 0 obj/);
});
