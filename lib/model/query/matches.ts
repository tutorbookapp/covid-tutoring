import { z } from 'zod';

import { Option, Query } from 'lib/model/query/base';

export const MatchesQuery = Query.extend({
  org: z.string().optional(),
  people: z.array(Option),
  subjects: z.array(Option),
});
export type MatchesQuery = z.infer<typeof MatchesQuery>;
