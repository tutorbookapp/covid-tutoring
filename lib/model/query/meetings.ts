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
