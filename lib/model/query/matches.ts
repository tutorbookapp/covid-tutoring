import url from 'url';

import { z } from 'zod';

import { Option, Query, number } from 'lib/model/query/base';

export const MatchesQuery = Query.extend({
  org: z.string().optional(),
  people: z.array(Option).default([]),
  subjects: z.array(Option).default([]),
  hitsPerPage: number.default(10),
});
export type MatchesQuery = z.infer<typeof MatchesQuery>;

export function endpoint(query: MatchesQuery, pathname = '/api/matches'): string {
  function encode(p?: unknown): string {
    return encodeURIComponent(JSON.stringify(p));
  }

  const params: Record<string, string | number> = {};
  if (query.search) params.search = encodeURIComponent(query.search);
  if (query.hitsPerPage !== 10) params.hitsPerPage = query.hitsPerPage;
  if (query.page !== 0) params.page = query.page;
  if (query.org) params.org = encodeURIComponent(query.org);
  if (query.people.length) params.people = encode(query.people);
  if (query.subjects.length) params.subjects = encode(query.subjects);
  return url.format({ pathname, query: params });
}
