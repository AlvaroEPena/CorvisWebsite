import type { ContactInput } from '../lib/contracts/contact';
import { LOG_PREFIX, type Logger } from './deps';
import type { PandaDocConfig } from './env';
import { BUDGET_LABELS, SERVICE_LABELS } from './mailer';

const API_BASE = 'https://api.pandadoc.com/public/v1';
const TIMEOUT_MS = 10_000;
const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 1500;

/** Role name that the PandaDoc template must define for the client recipient. */
export const PANDADOC_RECIPIENT_ROLE = 'Client';

/** Template variable names, to be inserted in the PandaDoc template as [Client.Name] etc. */
export const PANDADOC_TOKEN_NAMES = [
  'Client.Name',
  'Client.Company',
  'Client.Service',
  'Client.Budget',
  'Client.Message',
  'Client.Website',
] as const;

interface ProposalOptions {
  lead: ContactInput;
  config: PandaDocConfig;
  fetch: typeof fetch;
  logger: Pick<Logger, 'error'>;
  sleep: (ms: number) => Promise<void>;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `API-Key ${apiKey}`, 'Content-Type': 'application/json' };
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const [first = '', ...rest] = fullName.split(/\s+/);
  return { first_name: first, last_name: rest.join(' ') };
}

function buildDocumentRequest(lead: ContactInput, templateId: string): Record<string, unknown> {
  const values: Record<(typeof PANDADOC_TOKEN_NAMES)[number], string> = {
    'Client.Name': lead.name,
    'Client.Company': lead.company ?? '',
    'Client.Service': SERVICE_LABELS[lead.service],
    'Client.Budget': lead.budget ? BUDGET_LABELS[lead.budget] : '',
    'Client.Message': lead.message,
    'Client.Website': lead.website ?? '',
  };
  return {
    name: `Corvis proposal for ${lead.company || lead.name}`,
    template_uuid: templateId,
    recipients: [{ email: lead.email, ...splitName(lead.name), role: PANDADOC_RECIPIENT_ROLE }],
    tokens: PANDADOC_TOKEN_NAMES.map((name) => ({ name, value: values[name] })),
  };
}

async function call(
  options: ProposalOptions,
  step: string,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<Record<string, unknown>> {
  const response = await options.fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: authHeaders(options.config.apiKey),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${step} responded with HTTP ${response.status}`);
  const result: unknown = await response.json().catch(() => ({}));
  return typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : {};
}

/** PandaDoc builds documents asynchronously; only a `document.draft` can be sent. */
async function waitForDraft(options: ProposalOptions, documentId: string): Promise<boolean> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    await options.sleep(POLL_INTERVAL_MS);
    const { status } = await call(options, 'status check', `/documents/${documentId}`, {
      method: 'GET',
    });
    if (status === 'document.draft') return true;
    if (status === 'document.error') throw new Error('document creation ended in error');
  }
  return false;
}

/**
 * Creates a proposal from the template for a new lead and, when configured, sends it.
 * Never throws: a PandaDoc problem must not affect the lead. Logs a short reason only,
 * never keys or visitor data.
 */
export async function createProposal(options: ProposalOptions): Promise<void> {
  try {
    const created = await call(options, 'create document', '/documents', {
      method: 'POST',
      body: buildDocumentRequest(options.lead, options.config.templateId),
    });
    if (!options.config.autoSend) return;

    const documentId = created.id;
    if (typeof documentId !== 'string' || !/^[\w-]+$/.test(documentId)) {
      throw new Error('create document returned no usable id');
    }
    if (!(await waitForDraft(options, documentId))) {
      throw new Error('document did not reach draft in time; left unsent');
    }
    await call(options, 'send document', `/documents/${documentId}/send`, {
      method: 'POST',
      body: {
        subject: 'Your Corvis proposal',
        message: `Hi ${options.lead.name}, thanks for getting in touch. Your proposal is ready to review.`,
        silent: false,
      },
    });
  } catch (error) {
    options.logger.error(
      `${LOG_PREFIX} PandaDoc proposal failed`,
      error instanceof Error ? error.message : 'unknown error',
    );
  }
}
