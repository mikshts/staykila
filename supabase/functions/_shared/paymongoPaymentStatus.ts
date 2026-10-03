type PayMongoCheckoutAttributes = {
  status?: string;
  payment_method_used?: string;
  payment_intent?: { attributes?: { status?: string } };
  payments?: Array<{
    attributes?: { status?: string; source?: { type?: string } };
  }>;
};

export function normalizePayMongoCheckoutStatus(
  attributes: PayMongoCheckoutAttributes | null | undefined,
) {
  if (!attributes) return { status: "unknown", paymentMethod: null };

  const paymentIntentStatus = attributes.payment_intent?.attributes?.status;
  const paidPayment = attributes.payments?.find(
    (payment) => payment.attributes?.status === "paid",
  );

  if (paymentIntentStatus === "succeeded" || paidPayment) {
    return {
      status: "paid",
      paymentMethod:
        paidPayment?.attributes?.source?.type ||
        attributes.payment_method_used ||
        "paymongo",
    };
  }

  if (attributes.status === "expired") {
    return { status: "expired", paymentMethod: null };
  }

  if (
    paymentIntentStatus === "processing" ||
    paymentIntentStatus === "awaiting_payment_method" ||
    paymentIntentStatus === "awaiting_next_action" ||
    attributes.status === "active"
  ) {
    return { status: "pending", paymentMethod: null };
  }

  return { status: "unknown", paymentMethod: null };
}