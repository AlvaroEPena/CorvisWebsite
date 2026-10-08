import { describe, expect, it } from 'vitest';
import { PANDADOC_RECIPIENT_ROLE, PANDADOC_TOKEN_NAMES } from '../../../src/worker/pandadoc';
import {
  LIVE_ENV,
  PANDADOC_CREATE_URL,
  PANDADOC_SEND_URL,
  PANDADOC_STATUS_URL,
  RESEND_URL,
  createHarness,
  post,
  validPayload,
  type Responders,
} from './helpers';
import type { Env } from '../../../src/worker/env';

const PANDA_ENV: Env = {
  ...LIVE_ENV,
  PANDADOC_API_KEY: 'pd_key_secret',
  PANDADOC_TEMPLATE_ID: 'tmpl_123',
  PANDADOC_AUTO_SEND: 'true',
};

async function submit(env: Env, responders: Responders = {}) {
  const harness = createHarness({ responders });
  const response = await harness.handler(post(validPayload()), env);
  await harness.flush();
  return { ...harness, status: response.status };
}

describe('PandaDoc proposal on lead', () => {
  it('does nothing when PandaDoc is not configured', async () => {
    const { network, status } = await submit(LIVE_ENV);
    expect(status).toBe(200);
    expect(network.callsTo(PANDADOC_CREATE_URL)).toHaveLength(0);
  });

  it('stays disabled when only the key is set', async () => {
    const { network } = await submit({ ...LIVE_ENV, PANDADOC_API_KEY: 'k' });
    expect(network.callsTo(PANDADOC_CREATE_URL)).toHaveLength(0);
  });

  it('creates the document from the template, polls until draft, then sends', async () => {
    const statuses = ['document.uploaded', 'document.uploaded', 'document.draft'];
    const { network, sleep, status } = await submit(PANDA_ENV, {
      [`GET ${PANDADOC_STATUS_URL}`]: () => Response.json({ status: statuses.shift() }),
    });

    expect(status).toBe(200);
    const create = network.callsTo(PANDADOC_CREATE_URL)[0];
    expect((create?.init.headers as Record<string, string>).Authorization).toBe(
      'API-Key pd_key_secret',
    );
    const body = network.jsonBodyOf(PANDADOC_CREATE_URL) as {
      template_uuid: string;
      recipients: Array<Record<string, string>>;
      tokens: Array<{ name: string; value: string }>;
    };
    expect(body.template_uuid).toBe('tmpl_123');
    expect(body.recipients).toEqual([
      {
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        role: PANDADOC_RECIPIENT_ROLE,
      },
    ]);
    expect(body.tokens.map((token) => token.name)).toEqual([...PANDADOC_TOKEN_NAMES]);
    const tokens = Object.fromEntries(body.tokens.map((token) => [token.name, token.value]));
    expect(tokens).toMatchObject({
      'Client.Name': 'Ada Lovelace',
      'Client.Company': 'Analytical Engines',
      'Client.Service': 'Website redesign',
      'Client.Budget': '$3k to $6k',
      'Client.Website': 'https://example.com',
    });
    expect(tokens['Client.Message']).toContain('calm, fast new site');

    expect(network.callsTo(PANDADOC_STATUS_URL)).toHaveLength(3);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(network.callsTo(PANDADOC_SEND_URL)).toHaveLength(1);
    // The owner email goes out before any PandaDoc call.
    const order = network.calls.map((call) => call.url);
    expect(order.indexOf(RESEND_URL)).toBeLessThan(order.indexOf(PANDADOC_CREATE_URL));
  });

  it('leaves a draft unsent when PANDADOC_AUTO_SEND is not "true"', async () => {
    const { network } = await submit({ ...PANDA_ENV, PANDADOC_AUTO_SEND: 'false' });
    expect(network.callsTo(PANDADOC_CREATE_URL)).toHaveLength(1);
    expect(network.callsTo(PANDADOC_STATUS_URL)).toHaveLength(0);
    expect(network.callsTo(PANDADOC_SEND_URL)).toHaveLength(0);
  });

  it('gives up with a log (and no send) when the document never reaches draft', async () => {
    const { network, logger, status } = await submit(PANDA_ENV, {
      [`GET ${PANDADOC_STATUS_URL}`]: () => Response.json({ status: 'document.uploaded' }),
    });
    expect(status).toBe(200);
    expect(network.callsTo(PANDADOC_STATUS_URL)).toHaveLength(6);
    expect(network.callsTo(PANDADOC_SEND_URL)).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('stops polling when PandaDoc reports document.error', async () => {
    const { network, logger } = await submit(PANDA_ENV, {
      [`GET ${PANDADOC_STATUS_URL}`]: () => Response.json({ status: 'document.error' }),
    });
    expect(network.callsTo(PANDADOC_STATUS_URL)).toHaveLength(1);
    expect(network.callsTo(PANDADOC_SEND_URL)).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it.each<[string, Responders]>([
    ['create fails', { [`POST ${PANDADOC_CREATE_URL}`]: () => new Response('x', { status: 401 }) }],
    [
      'create throws',
      {
        [`POST ${PANDADOC_CREATE_URL}`]: () => {
          throw new TypeError('network down');
        },
      },
    ],
    ['send fails', { [`POST ${PANDADOC_SEND_URL}`]: () => new Response('x', { status: 500 }) }],
  ])(
    'never fails the lead when %s, and logs no keys or personal data',
    async (_name, responders) => {
      const { status, logger, network } = await submit(PANDA_ENV, responders);
      expect(status).toBe(200);
      expect(network.callsTo(RESEND_URL)).toHaveLength(1);
      expect(logger.error).toHaveBeenCalled();
      const logged = JSON.stringify(logger.error.mock.calls);
      expect(logged).not.toContain('pd_key_secret');
      expect(logged).not.toContain('ada@example.com');
      expect(logged).not.toContain('Ada');
    },
  );

  it('does not run when the owner email failed', async () => {
    const harness = createHarness({
      responders: { [`POST ${RESEND_URL}`]: () => new Response('x', { status: 500 }) },
    });
    const response = await harness.handler(post(validPayload()), PANDA_ENV);
    await harness.flush();
    expect(response.status).toBe(502);
    expect(harness.network.callsTo(PANDADOC_CREATE_URL)).toHaveLength(0);
  });

  it('does not run for honeypot submissions', async () => {
    const harness = createHarness();
    await harness.handler(post(validPayload({ nickname: 'bot' })), PANDA_ENV);
    await harness.flush();
    expect(harness.network.calls).toHaveLength(0);
  });
});
