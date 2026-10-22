import type { PaymentProvider } from "./types";

/**
 * Stand-in until the real gateway is chosen. The checkout page shows a "Pay (test)" button
 * that calls a server action which confirms the order directly — no money involved.
 * Disabled in production unless ALLOW_MOCK_PAYMENTS=true (e.g. for a staging deploy).
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createOrder({ orderId }) {
    return { providerOrderId: `mock_${orderId}`, clientPayload: {} };
  },
  async verifyWebhook() {
    return null;
  },
};

export function mockPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true";
}
