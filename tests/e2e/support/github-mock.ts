import { createHash } from 'node:crypto';

import type { Page, Route } from '@playwright/test';

/** One file the editor wrote in a commit: its repo path and new text (null when deleted). */
export interface CommittedFile {
  path: string;
  text: string | null;
}

const sha1 = (text: string) =>
  createHash('sha1')
    .update(`blob ${Buffer.byteLength(text)}\0${text}`)
    .digest('hex');
const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * A tiny in-memory stand-in for the parts of GitHub that Sveltia CMS talks to (user, repo, tree, file
 * contents, and the commit mutation). The editor believes it is signed in with a real token; nothing
 * leaves the machine. `commits` collects what each Save would have written.
 */
export class GithubMock {
  readonly commits: CommittedFile[][] = [];
  readonly unhandled: string[] = [];

  private readonly files: Map<string, string>;

  constructor(files: Map<string, string>) {
    this.files = files;
  }

  async install(page: Page): Promise<void> {
    await page.addInitScript(() => {
      localStorage.setItem(
        'sveltia-cms.user',
        JSON.stringify({
          backendName: 'github',
          token: 'ghp_test',
          id: 1,
          login: 'owner',
          name: 'Owner',
          avatarURL: '',
          email: 'owner@example.test',
        }),
      );
    });
    await page.route(/api\.github\.com|githubusercontent\.com/, (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/user') {
      return json(route, { login: 'owner', id: 1, name: 'Owner', avatar_url: '', html_url: '' });
    }
    if (/^\/repos\/[^/]+\/[^/]+$/.test(url.pathname)) {
      return json(route, { permissions: { push: true }, default_branch: 'main' });
    }
    if (url.pathname.includes('/git/trees/')) {
      const tree = [...this.files].map(([path, text]) => ({
        path,
        type: 'blob',
        sha: sha1(text),
        size: text.length,
      }));
      return json(route, { sha: 'tree1', tree, truncated: false });
    }
    if (url.pathname === '/graphql') return this.graphql(route, request.postDataJSON());
    this.unhandled.push(`${request.method()} ${url.pathname}`);
    return json(route, {});
  }

  private graphql(route: Route, payload: { query: string; variables: Record<string, unknown> }) {
    const { query, variables } = payload;
    if (query.includes('history(first: 1)')) {
      return json(route, {
        data: {
          repository: {
            ref: { target: { history: { nodes: [{ oid: 'head1', message: 'init' }] } } },
          },
        },
      });
    }
    if (query.includes('refUpdateRule')) {
      return json(route, {
        data: { repository: { ref: { refUpdateRule: { viewerCanPush: true } } } },
      });
    }
    const contents = [...query.matchAll(/(content_\d+)\s*:\s*object\(oid: "([0-9a-f]+)"\)/g)];
    if (contents.length > 0) {
      const byOid = new Map([...this.files.values()].map((text) => [sha1(text), text]));
      const repository = Object.fromEntries(
        contents.map(([, alias, oid]) => [
          alias,
          { text: byOid.get(oid ?? '') ?? '', isTruncated: false },
        ]),
      );
      return json(route, { data: { repository } });
    }
    const histories = [...query.matchAll(/(commit_\d+)\s*:\s*ref\(/g)];
    if (histories.length > 0) {
      const node = {
        author: { name: 'Owner', email: 'owner@example.test', user: { id: 1, login: 'owner' } },
        committedDate: '2026-10-01T10:00:00Z',
      };
      const repository = Object.fromEntries(
        histories.map(([, alias]) => [alias, { target: { history: { nodes: [node] } } }]),
      );
      return json(route, { data: { repository } });
    }
    if (
      /ref\(qualifiedName: \$branch\) \{ target \{ \.\.\. on Commit \{ oid/.test(
        query.replace(/\s+/g, ' '),
      )
    ) {
      return json(route, { data: { repository: { ref: { target: { oid: 'head1' } } } } });
    }
    const statuses = [...query.matchAll(/(commit_\d+)\s*:\s*object\(/g)];
    if (statuses.length > 0) {
      const repository = Object.fromEntries(
        statuses.map(([, alias]) => [
          alias,
          { status: null, deployments: { nodes: [] }, checkSuites: { nodes: [] } },
        ]),
      );
      return json(route, { data: { repository } });
    }
    if (query.includes('createCommitOnBranch')) return this.commit(route, variables);
    this.unhandled.push(`graphql ${query.replace(/\s+/g, ' ').slice(0, 400)}`);
    return json(route, { data: {} });
  }

  private commit(route: Route, variables: Record<string, unknown>) {
    const input = variables.input as {
      fileChanges: {
        additions?: { path: string; contents: string }[];
        deletions?: { path: string }[];
      };
    };
    const changed: CommittedFile[] = [
      ...(input.fileChanges.additions ?? []).map(({ path, contents }) => ({
        path,
        text: Buffer.from(contents, 'base64').toString('utf8'),
      })),
      ...(input.fileChanges.deletions ?? []).map(({ path }) => ({ path, text: null })),
    ];
    for (const { path, text } of changed) {
      if (text === null) this.files.delete(path);
      else this.files.set(path, text);
    }
    this.commits.push(changed);
    return json(route, {
      data: {
        createCommitOnBranch: { commit: { oid: `head${this.commits.length + 1}`, url: '' } },
      },
    });
  }
}
