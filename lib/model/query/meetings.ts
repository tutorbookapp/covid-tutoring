import url from 'url';

import { z } from 'zod';

import { MatchesQuery } from 'lib/model/query/matches';
import { MeetingHitTag } from 'lib/model/meeting';
import { date } from 'lib/model/timeslot';
import { number } from 'lib/model/query/base';

export const MeetingsQuery = MatchesQuery.extend({
  tags: z.array(MeetingHitTag),
  from: date.default(() => new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() - new Date().getDay()
  )),
  to: date.default(() => new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() - new Date().getDay() + 7
  )),
  hitsPerPage: number.default(1000),
});
export type MeetingsQuery = z.infer<typeof MeetingsQuery>;

export function endpoint(query: MeetingsQuery, pathname = '/api/meetings'): string {
  function encode(p?: unknown): string {
    return encodeURIComponent(JSON.stringify(p));
  }

  const params: Record<string, string | number> = {};
  if (query.search) params.search = encodeURIComponent(query.search);
  if (query.hitsPerPage !== 1000) params.hitsPerPage = query.hitsPerPage;
  if (query.page !== 0) params.page = query.page;
  if (query.tags.length) params.tags = encode(query.tags);
  params.from = query.from.toJSON();
  params.to = query.to.toJSON();
  return url.format({ pathname, query: params });
}
