import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

// Add the real gateway here once chosen, e.g. `razorpay: razorpayProvider`.
const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
};

export function getProvider(name: string): PaymentProvider | undefined {
  return providers[name];
}

export function activeProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
  return provider;
}

export type { PaymentProvider } from "./types";
