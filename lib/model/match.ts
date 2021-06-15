import { z } from 'zod';

import { Person } from 'lib/model/person';
import { Resource } from 'lib/model/resource';

export const MatchTag = z.literal('meeting'); // Match has at least one meeting.
export const MatchHitTag = z.union([MatchTag, z.literal('not-meeting')]);
export const MATCH_TAGS: z.infer<typeof MatchTag>[] = ['meeting'];

/**
 * Represents a tutoring lesson or mentoring appointment.
 * @typedef {Object} MatchInterface
 * @property org - The ID of the organization that owns this request or match.
 * @property subjects - The subjects that this match is about (e.g. AP CS).
 * @property people - The people involved in this match (i.e. pupil and tutor).
 * @property creator - The person who created this match (e.g. pupil or admin).
 * @property message - A more detailed description of this match or request.
 */
export const Match = Resource.extend({
  org: z.string().default('default'),
  subjects: z.array(z.string()).default([]),
  people: z.array(Person).default([]),
  creator: Person.default(Person.parse({})),
  message: z.string().default(''),
  tags: z.array(MatchTag).default([]),
  id: z.string().default(''),
});
export type Match = z.infer<typeof Match>;
export type MatchJSON = z.input<typeof Match>;
