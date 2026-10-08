import type { Env } from './env';

export type Logger = Pick<Console, 'error' | 'warn'>;

/** The slice of the Workers ExecutionContext we use (workers-types is not installed). */
export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export type RouteHandler = (request: Request, env: Env, ctx: WorkerContext) => Promise<Response>;

export const LOG_PREFIX = '[corvis]';
