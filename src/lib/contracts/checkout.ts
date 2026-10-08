import { z } from 'zod';

/**
 * Deposit catalog. The server (Worker) is the only source of truth for amounts: the client
 * sends a package id, never a price. Figures are PLACEHOLDERS until the owner confirms pricing;
 * keep them in step with `src/content/pricing.ts` (package ids must match).
 */
export const DEPOSIT_PACKAGES = {
  launchpad: { name: 'The Launchpad Foundation: project deposit', depositUsdCents: 225_000 },
  'market-leader': { name: 'The Market Leader: project deposit', depositUsdCents: 340_000 },
} as const;

export type DepositPackageId = keyof typeof DEPOSIT_PACKAGES;
export const DEPOSIT_PACKAGE_IDS = Object.keys(DEPOSIT_PACKAGES) as [
  DepositPackageId,
  ...DepositPackageId[],
];

/** Payload for `POST /api/checkout`. */
export const checkoutInputSchema = z.object({
  package: z.enum(DEPOSIT_PACKAGE_IDS),
  /** Optional prefill so Stripe Checkout and the receipt use the lead's email. */
  email: z.email().max(160).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export type CheckoutResponse =
  | { ok: true; url: string }
  | {
      ok: false;
      error: 'validation' | 'rate_limited' | 'checkout_unavailable' | 'checkout_failed';
    };

/** Same-origin pages Stripe returns to. */
export const CHECKOUT_SUCCESS_PATH = '/thanks';
export const CHECKOUT_CANCEL_PATH = '/#pricing';
