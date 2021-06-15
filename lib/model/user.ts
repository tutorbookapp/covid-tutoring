import { z } from 'zod';

import { Account } from 'lib/model/account';
import { Aspect } from 'lib/model/aspect';
import { Availability } from 'lib/model/availability';
import { Role } from 'lib/model/person';
import { Verification } from 'lib/model/verification';

/**
 * Various tags that are added to the Algolia users search during indexing (via
 * the `lib/api/algolia.ts` API back-end module). For in-depth explanations of
 * each one, reference the link included below.
 * @see {@link https://github.com/tutorbookapp/tutorbook/tree/TAGS.md}
 */
export const UserTag = z.union([
  z.literal('vetted'),
  z.literal('matched'),
  z.literal('meeting'),
  Role,
]);
export const UserHitTag = z.union([
  UserTag,
  z.literal('not-tutor'),
  z.literal('not-tutee'),
  z.literal('not-mentor'),
  z.literal('not-mentee'),
  z.literal('not-parent'),
  z.literal('not-vetted'),
  z.literal('not-matched'),
  z.literal('not-meeting'),
]);
export const USER_TAGS: z.infer<typeof UserTag>[] = [
  'tutor',
  'tutee',
  'mentor',
  'mentee',
  'parent',
  'vetted',
  'matched',
  'meeting',
];

export const Subjects = z.object({ 
  subjects: z.array(z.string()),
  searches: z.array(z.string()),
});
export type Subjects = z.infer<typeof Subjects>;

/**
 * A user object (that is stored in their Firestore profile document by uID).
 * @typedef {Object} UserInterface
 * @extends AccountInterface
 * @property [age] - The user's age (mostly used for students).
 * @property orgs - An array of the IDs of the orgs this user belongs to.
 * @property zooms - An array of Zoom user accounts. These are used when
 * creating Zoom meetings for a match. Each TB user can have multiple Zoom user
 * accounts managed by different orgs; we use the Zoom account belonging to the
 * org that owns the match when creating Zoom meetings for said match.
 * @property availability - An array of `Timeslot`'s when the user is free.
 * @property mentoring - The subjects that the user wants a and can mentor for.
 * @property tutoring - The subjects that the user wants a and can tutor for.
 * @property langs - The languages (as ISO codes) the user can speak fluently.
 * @property parents - The Firebase uIDs of linked parent accounts.
 * @property visible - Whether or not this user appears in search results.
 * @property featured - Aspects in which this user is first in search results.
 * @property roles - Always empty unless in context of match or request.
 * @property tags - An array of user tags used for analytics and filtering.
 * @property reference - How the user heard about TB or the org they're joining.
 * @property timezone - The user's time zone (e.g. America/Los_Angeles). This is
 * collected by our front-end and used by our back-end when sending reminders.
 * @property [token] - The user's Firebase Authentication JWT `idToken`.
 * @property [hash] - The user's Intercom HMAC for identity verifications.
 * @todo Add a `zoom` prop that contains the user's personal Zoom OAuth token
 * (e.g. for freelancers who want to user their own Zoom account when creating
 * meetings).
 */
export const User = Account.extend({
  age: z.number().optional(),
  orgs: z.array(z.string()),
  availability: Availability,
  mentoring: Subjects,
  tutoring: Subjects,
  langs: z.array(z.string()),
  parents: z.array(z.string()),
  verifications: z.array(Verification),
  visible: z.boolean(),
  featured: z.array(Aspect),
  roles: z.array(Role),
  tags: z.array(UserTag),
  reference: z.string(),
  timezone: z.string(),
  token: z.string().optional(),
  hash: z.string().optional(),
});
export type User = z.infer<typeof User>;
export type UserJSON = z.input<typeof User>;
