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
