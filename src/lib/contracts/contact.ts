import { z } from 'zod';

export const SERVICES = ['redesign', 'new-build', 'care-plan', 'not-sure'] as const;
export const BUDGETS = ['under-3k', '3k-6k', '6k-12k', '12k-plus', 'not-sure'] as const;

/** Minimum time (ms) between form render and submit; faster submits are treated as bots. */
export const MIN_FILL_MS = 3000;

/** Payload for `POST /api/contact`. Shared by the client form and the Worker. */
export const contactInputSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.email('Please enter a valid email').max(160),
  company: z.string().trim().max(120).optional(),
  website: z.url('Please enter a full URL, e.g. https://example.com').max(200).optional(),
  service: z.enum(SERVICES),
  budget: z.enum(BUDGETS).optional(),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(2000),
  consent: z.literal(true, { error: 'Please accept the privacy note' }),
  turnstileToken: z.string().min(1, 'Please complete the check'),
  /** Honeypot: hidden field; real users leave it empty. */
  nickname: z.string().max(0).optional(),
  /** Client-measured ms from form render to submit. */
  elapsedMs: z.number().min(MIN_FILL_MS),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'validation'; errors: Record<string, string[]> }
  | { ok: false; error: 'turnstile' | 'too_fast' | 'rate_limited' | 'send_failed' };

/** Non-contract transport failures the Worker may also return; clients treat any `ok:false` as failure. */
export type TransportError = 'forbidden' | 'not_found' | 'method_not_allowed';
