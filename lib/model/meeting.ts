import { z } from 'zod';

import { Match } from 'lib/model/match';
import { Person } from 'lib/model/person';
import { Resource } from 'lib/model/resource';
import { Timeslot } from 'lib/model/timeslot';
import { Venue } from 'lib/model/venue';

export const MeetingTag = z.literal('recurring'); // Meeting is recurring (has rrule).
export const MeetingHitTag = z.union([MeetingTag, z.literal('not-recurring')]);
export const MEETING_TAGS: MeetingTag[] = ['recurring'];
export type MeetingTag = z.infer<typeof MeetingTag>;
export type MeetingHitTag = z.infer<typeof MeetingHitTag>;

/**
 * @typedef MeetingAction
 * @description Action to take when updating recurring meetings.
 * @property all - Update all of the recurring meetings.
 * @property future - Update this and all future meetings.
 * @property this - Only update this meeting instance.
 */
export const MeetingAction = z.union([
  z.literal('all'),
  z.literal('future'),
  z.literal('this'),
]);
export type MeetingAction = z.infer<typeof MeetingAction>;

/**
 * A meeting's status starts as `pending`, becomes `logged` once a tutor or
 * student confirms they've attended the meeting, and finally becomes `approved`
 * once an org admin (or an automation they've setup) approves the logged hours.
 * @typedef MeetingStatus
 * @todo Implement the approval process so that the `approved` status is used.
 */
export const MeetingStatus = z.union([
  z.literal('created'),
  z.literal('pending'),
  z.literal('logged'),
  z.literal('approved'),
]);
export type MeetingStatus = z.infer<typeof MeetingStatus>;

/**
 * A meeting is a past appointment logged for a match (e.g. John and Jane met
 * last week for 30 mins on Tuesday 3:00 - 3:30 PM).
 * @typedef {Object} Meeting
 * @extends Resource
 * @property status - This meeting's status (i.e. pending, logged, or approved).
 * @property creator - The person who created this meeting.
 * @property match - This meeting's match.
 * @property venue - Link to the meeting venue (e.g. Zoom or Jitsi).
 * @property time - Time of the meeting (e.g. Tuesday 3:00 - 3:30 PM).
 * @property creator - The person who logged the meeting (typically the tutor).
 * @property description - Notes about the meeting (e.g. what they worked on).
 * @property [parentId] - The recurring parent meeting ID (if any).
 */
export const Meeting = Resource.extend({
  status: MeetingStatus.default('created'),
  creator: Person.default(Person.parse({})),
  match: Match.default(Match.parse({})),
  venue: Venue.default(Venue.parse({})),
  time: Timeslot.default(Timeslot.parse({})),
  description: z.string().default(''),
  tags: z.array(MeetingTag).default([]),
  parentId: z.string().optional(),
  id: z.string().default(''), 
});
export type Meeting = z.infer<typeof Meeting>;
export type MeetingJSON = z.input<typeof Meeting>;
