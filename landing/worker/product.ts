export const PRODUCT = { id: "capturita", name: "Capturita Pro", amountPaise: 99900, currency: "INR", updatesMonths: 12 } as const;
export const REFUND_WINDOW_DAYS = 14;

/** Day 14 is still inside the window, day 15 is not. */
export const withinRefundWindow = (paidAt: number, now: number) => now - paidAt <= REFUND_WINDOW_DAYS * 86400;

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
export const nowSec = () => Math.floor(Date.now() / 1000);
