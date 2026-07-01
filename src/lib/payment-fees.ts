export const PLATFORM_FEE_RATE = 0.02;

type FeeConfig = {
  label: string;
  rate: number;
  fixed: number;
};

const PROCESSING_FEES: Record<string, FeeConfig> = {
  ecocash: { label: "EcoCash processing", rate: 0.025, fixed: 0 },
  onemoney: { label: "OneMoney processing", rate: 0.025, fixed: 0 },
  telecash: { label: "Telecash processing", rate: 0.025, fixed: 0 },
  card: { label: "Card processing", rate: 0.035, fixed: 0.5 },
  vpayments: { label: "VPayments processing", rate: 0.01, fixed: 0.5 },
  zipit: { label: "ZIPIT processing", rate: 0, fixed: 0 },
  cash_on_delivery: { label: "Cash on delivery", rate: 0, fixed: 0 },
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

export function calculateBuyerCharges(subtotal: number, paymentMethod?: string | null) {
  const platformFee = roundMoney(subtotal * PLATFORM_FEE_RATE);
  const config = PROCESSING_FEES[paymentMethod ?? ""] ?? { label: "Payment processing", rate: 0, fixed: 0 };
  const beforeProcessing = subtotal + platformFee;
  const buyerTotal =
    config.rate > 0 || config.fixed > 0
      ? roundMoney((beforeProcessing + config.fixed) / (1 - config.rate))
      : roundMoney(beforeProcessing);
  const processingFee = Math.max(0, roundMoney(buyerTotal - beforeProcessing));

  return {
    subtotal: roundMoney(subtotal),
    platformFee,
    processingFee,
    buyerTotal,
    sellerPayout: roundMoney(subtotal),
    processingLabel: config.label,
    processingRate: config.rate,
    processingFixed: config.fixed,
  };
}

export function splitExistingBuyerTotal(total: number, subtotal: number) {
  const platformFee = roundMoney(subtotal * PLATFORM_FEE_RATE);
  const processingFee = Math.max(0, roundMoney(total - subtotal - platformFee));
  return {
    subtotal: roundMoney(subtotal),
    platformFee,
    processingFee,
    buyerTotal: roundMoney(total),
    sellerPayout: roundMoney(subtotal),
  };
}
