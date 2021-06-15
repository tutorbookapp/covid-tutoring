import { z } from 'zod';

export const Option = z.object({
  label: z.string(),
  value: z.string(),
});
export type Option = z.infer<typeof Option>;

export const number = z.string().or(z.number()).refine((s) => !Number.isNaN(Number(s))).transform((s) => Number(s));

/**
 * The base object just supports pagination, text-based search, and tag filters.
 * @abstract
 * @property search - The current string search query.
 * @property orgs - The organizations that the resource belongs to.
 * @property tags - Algolia search `__tags` (e.g. `NOT_YET_VETTED`).
 * @property hitsPerPage - The number of hits to display per page (pagination).
 * @property page - The current page number (for pagination purposes).
 */
export const Query = z.object({
  search: z.string().transform((s) => decodeURIComponent(s)).default(''),
  hitsPerPage: number.default(20),
  page: number.default(0),
});
export type Query = z.infer<typeof Query>;
export type QueryJSON = z.input<typeof Query>;

// TODO: Do I really need this conversion method at all? Ideally, I would rely
// solely on `zod` to convert URI encoded objects to `Query` and then depend on
// the browser's built-in conversions to encode `Query` into URI params.
export type Params = Record<string, string | number | boolean>;
export function getURLParams(query: Query): Params {
  const params: Params = {};
  if (query.search) params.search = encodeURIComponent(query.search);
  if (query.hitsPerPage !== 20) params.hitsPerPage = query.hitsPerPage;
  if (query.page !== 0) params.page = query.page;
  return params;
}
