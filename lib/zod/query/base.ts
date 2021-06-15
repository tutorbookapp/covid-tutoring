import { z } from 'zod';

export const Option = z.object({
  label: z.string(),
  value: z.string(),
});

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
  search: z.string(),
  hitsPerPage: z.number(),
  page: z.number(),
});
