// Contact Worker entry (owned by backend-engineer). Serves POST /api/contact;
// every other path is handled by static assets (see wrangler.jsonc run_worker_first).
export default {
  async fetch(): Promise<Response> {
    return new Response('Not implemented', { status: 501 });
  },
};
