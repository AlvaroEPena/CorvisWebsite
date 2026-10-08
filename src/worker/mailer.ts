import { DEPOSIT_PACKAGES } from '../lib/contracts/checkout';
import type { BUDGETS, SERVICES, ContactInput } from '../lib/contracts/contact';
import { escapeHtml } from './escape';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

export const SERVICE_LABELS: Record<(typeof SERVICES)[number], string> = {
  redesign: 'Website redesign',
  'new-build': 'New website build',
  'care-plan': 'Care plan',
  'not-sure': 'Not sure yet',
};

export const BUDGET_LABELS: Record<(typeof BUDGETS)[number], string> = {
  'under-3k': 'Under $3k',
  '3k-6k': '$3k to $6k',
  '6k-12k': '$6k to $12k',
  '12k-plus': '$12k+',
  'not-sure': 'Not sure yet',
};

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

/** Collapses control characters so visitor input can never break out of a header line. */
function singleLine(value: string): string {
  // eslint-disable-next-line no-control-regex -- the control range is exactly what is removed
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

function describeFields(lead: ContactInput): Array<[label: string, value: string]> {
  const fields: Array<[string, string | undefined]> = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Company', lead.company],
    ['Website', lead.website],
    ['Service', SERVICE_LABELS[lead.service]],
    ['Budget', lead.budget ? BUDGET_LABELS[lead.budget] : undefined],
  ];
  return fields.filter((field): field is [string, string] => Boolean(field[1]));
}

function renderEmail(
  fields: Array<[label: string, value: string]>,
  message?: string,
): { text: string; html: string } {
  const text = [
    ...fields.map(([label, value]) => `${label}: ${value}`),
    ...(message === undefined ? [] : ['', 'Message:', message]),
  ].join('\n');

  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 12px 4px 0;vertical-align:top">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const messageHtml =
    message === undefined
      ? ''
      : `<h2 style="font-family:sans-serif;font-size:16px;margin:20px 0 6px">Message</h2>` +
        `<p style="font-family:sans-serif;font-size:15px;white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>`;
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:15px">${rows}</table>${messageHtml}`;
  return { text, html };
}

export function buildLeadEmail(
  lead: ContactInput,
  addresses: { from: string; to: string },
): OutgoingEmail {
  const { text, html } = renderEmail(describeFields(lead), lead.message);

  return {
    from: addresses.from,
    to: addresses.to,
    replyTo: lead.email,
    subject: singleLine(`New Corvis inquiry: ${lead.name} (${SERVICE_LABELS[lead.service]})`),
    text,
    html,
  };
}

export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export interface PaidDeposit {
  sessionId: string;
  packageId: string | undefined;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | undefined;
}

/** Owner notification for a paid Stripe deposit. Values come from Stripe but are escaped anyway. */
export function buildPaymentEmail(
  deposit: PaidDeposit,
  addresses: { from: string; to: string },
): OutgoingEmail {
  const knownPackage = Object.entries(DEPOSIT_PACKAGES).find(([id]) => id === deposit.packageId);
  const packageName = knownPackage?.[1].name ?? deposit.packageId ?? 'Unknown package';
  const amount =
    deposit.amountTotal === null || deposit.currency === null
      ? 'Unknown'
      : formatMoney(deposit.amountTotal, deposit.currency);

  const { text, html } = renderEmail([
    ['Package', packageName],
    ['Amount', amount],
    ['Customer email', deposit.customerEmail ?? 'Not provided'],
    ['Stripe session', deposit.sessionId],
  ]);
  return {
    from: addresses.from,
    to: addresses.to,
    replyTo: deposit.customerEmail,
    subject: singleLine(`Corvis deposit paid: ${packageName} (${amount})`),
    text,
    html,
  };
}

/**
 * Sends through Resend's REST API with plain fetch. The official SDK adds bundle weight and
 * dependencies for what is a single POST, and fetch keeps the call injectable in tests.
 */
export function createResendSender(apiKey: string, fetchImpl: typeof fetch): SendEmail {
  return async (email) => {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Resend responded with HTTP ${response.status}`);
  };
}
