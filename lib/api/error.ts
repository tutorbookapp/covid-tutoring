import { ServerResponse } from 'http';

import { ZodError } from 'zod';

import { period } from 'lib/utils';

export interface APIErrorJSON {
  message: string;
  code: number;
}

/**
 * Custom `Error` class that contains an HTTP status code property.
 * @typedef {Object} APIError
 * @property code - The HTTP status code for this error (e.g. 401 or 500).
 * @todo Add i18n to human-readable error codes.
 * @todo Replace `code` with `status` and add a string `code` property that
 * allows our front-end to know exactly what error has occurred (e.g. a `code`
 * indicating that the user's JWT is invalid could be `auth/no-jwt`).
 */
export class APIError extends Error {
  public constructor(message: string, public readonly code: number = 400) {
    super(period(message));
  }

  public toJSON(): APIErrorJSON {
    return { message: this.message, code: this.code };
  }

  public static fromJSON(json: APIErrorJSON): APIError {
    return new APIError(json.message, json.code);
  }
}

function send(e: APIError, res: ServerResponse): void {
  const stringified = JSON.stringify(e);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(stringified));
  res.statusMessage = e.message;
  res.statusCode = e.code;
  res.end(stringified);
}

export function handle(e: unknown, res: ServerResponse): void {
  if (!(e instanceof APIError) || e.code !== 401)
    console.error('API endpoint encountered error:', e);
  if (e instanceof APIError) return send(e, res);
  if (e instanceof ZodError) return send(new APIError(e.message, 400), res);
  if (e instanceof Error) return send(new APIError(e.message, 500), res);
  if (typeof e === 'string') return send(new APIError(e, 500), res);
  return send(new APIError('Unknown error', 500), res);
}
