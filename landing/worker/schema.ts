import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);

export const checkoutSchema = z.object({
  email,
  name: z.string().trim().max(100).optional(),
  accepted_terms: z.literal(true),
  turnstile_token: z.string().max(2048).optional(),
});
export const verifySchema = z.object({
  razorpay_order_id: z.string().regex(/^order_\w+$/),
  razorpay_payment_id: z.string().regex(/^pay_\w+$/),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/),
});
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const licenseKey = z.string().min(20).max(2048);
export const activateSchema = z.object({ key: licenseKey, device_id: hex64, device_name: z.string().trim().max(100).optional() });
export const deactivateSchema = z.object({ key: licenseKey, target: z.union([hex64, z.string().regex(/^act_[a-f0-9]{20}$/)]) });
export const recoverSchema = z.object({ email, payment_id: z.string().regex(/^pay_\w+$/), turnstile_token: z.string().max(2048).optional() });
export const refundSchema = z.object({ orderId: z.string().regex(/^ord_\w+$/), reason: z.string().trim().max(300).optional() });
