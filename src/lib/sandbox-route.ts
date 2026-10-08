/**
 * Deep links for /sandbox: `#<project-id>/<before|after>`. Pure functions so the page controller
 * stays thin and the fallbacks (unknown id, "before" on a project without one) are unit tested.
 */
export type SandboxVersionKey = 'before' | 'after';

export interface SandboxRouteProject {
  id: string;
  hasBefore: boolean;
}

export interface SandboxSelection {
  projectId: string;
  version: SandboxVersionKey;
}

export function formatSandboxHash(projectId: string, version: SandboxVersionKey): string {
  return `${projectId}/${version}`;
}

/** Falls back to the first project's finished site for anything that does not resolve. */
export function parseSandboxHash(
  hash: string,
  projects: readonly SandboxRouteProject[],
): SandboxSelection {
  const first = projects[0];
  if (!first) throw new Error('The sandbox needs at least one project');

  const [rawId = '', rawVersion = ''] = hash.replace(/^#/, '').split('/');
  const project = projects.find((candidate) => candidate.id === rawId);
  if (!project) return { projectId: first.id, version: 'after' };

  const version: SandboxVersionKey =
    rawVersion === 'before' && project.hasBefore ? 'before' : 'after';
  return { projectId: project.id, version };
}

/** Live-region message announced when the selection changes. */
export function describeSelection(
  projectName: string,
  version: SandboxVersionKey,
  hasBefore: boolean,
): string {
  if (!hasBefore) return `Showing ${projectName}, a brand-new website built from scratch.`;
  return `Showing ${projectName}, ${version === 'before' ? 'the old website' : 'the new website'}.`;
}
