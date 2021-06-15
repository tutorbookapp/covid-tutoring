import { z } from 'zod';

import { Option, Query, number } from 'lib/model/query/base';

export const MatchesQuery = Query.extend({
  org: z.string().optional(),
  people: z.array(Option).default([]),
  subjects: z.array(Option).default([]),
  hitsPerPage: number.default(10),
});
export type MatchesQuery = z.infer<typeof MatchesQuery>;
