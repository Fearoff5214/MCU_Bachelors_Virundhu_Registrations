export type CreateOrderInput = {
  orderId: string;
  amountPaise: number;
  description: string;
  customer: { name?: string | null; email?: string | null };
};

export type WebhookOutcome = { providerOrderId: string; status: "paid" | "failed" };

export interface PaymentProvider {
  readonly name: string;
  /** Creates the order at the gateway. clientPayload is handed to the checkout UI (e.g. Razorpay order id + key). */
  createOrder(input: CreateOrderInput): Promise<{ providerOrderId: string; clientPayload: Record<string, unknown> }>;
  /** Verifies the webhook signature. Return null for events we don't care about or bad signatures. */
  verifyWebhook(req: Request): Promise<WebhookOutcome | null>;
  refund?(providerOrderId: string, amountPaise: number): Promise<void>;
}
