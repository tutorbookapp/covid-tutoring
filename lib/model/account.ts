import { z } from 'zod';

import { Resource } from 'lib/model/resource';

/**
 * Represents a user verification to provide social proof. Supported types are:
 * - A background check or UK DBS on file
 * - A verified academic email address (e.g. `ac.uk` or `stanford.edu`)
 * - A verified social media account (i.e. LinkedIn, Twitter, FB, Insta)
 * - A personal website (mostly just an easy way to link to a resume site)
 *
 * These "socials" are then shown directly beneath the user's name in the
 * `UserDialog` making it easy for students (and/or their parents) to view and
 * feel assured about a potential tutor's qualifications.
 */
export const SocialType = z.union([ 
  z.literal('website'),
  z.literal('linkedin'),
  z.literal('twitter'),
  z.literal('facebook'),
  z.literal('instagram'),
  z.literal('github'),
  z.literal('indiehackers'),
]);
export const Social = z.object({
  type: SocialType,
  url: z.string(),
});

/**
 * An account object that both orgs and users extend.
 * @typedef {Object} AccountInterface
 * @property id - The account's Firebase Authentication identifier.
 * @property name - Display name (e.g. "Nicholas Chiang").
 * @property photo - Profile photo URL (i.e. the account's avatar).
 * @property email - Email address (e.g. "nicholas@tutorbook.org").
 * @property bio - A description of the org or user.
 * @property background - An optional background or banner image shown on the
 * org landing page and user display page.
 * @property venue - The account's default meeting venue (e.g. a Zoom link).
 * @property socials - An array of the account's social media links.
 */
export const Account = Resource.extend({
  id: z.string(),
  name: z.string(),
  photo: z.string().url(),
  email: z.string().email(),
  phone: z.string().regex(/^(\+\d{1,3})\d{10}$/),
  bio: z.string(),
  background: z.string().url(),
  venue: z.string().url(),
  socials: z.array(Social),
});
