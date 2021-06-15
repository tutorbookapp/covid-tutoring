import { z } from 'zod';

import { MatchesQuery } from 'lib/model/query/matches';
import { MeetingHitTag } from 'lib/model/meeting';

export const MeetingsQueryInterface = MatchesQuery.extend({
  tags: z.array(MeetingHitTag),
  from: z.date(),
  to: z.date(),
});
