import { z } from 'zod';

import { Account } from 'lib/model/account';
import { Aspect } from 'lib/model/aspect';

const SignupConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
  bio: z.string(),
}));
const HomeConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
}));
const BookingConfig = z.object({}).catchall(z.object({
  message: z.string(),
}));

/**
 * The only two Zoom OAuth scopes that we ever will request access to.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/100}
 * @see {@link https://marketplace.zoom.us/docs/guides/auth/oauth/oauth-scopes}
 */
export const ZoomScope = z.union([
  z.literal('meeting:write:admin'),
  z.literal('user:write:admin'),
]);

/**
 * An authentication config for a certain Zoom account. This enables us to call
 * Zoom APIs on behalf of a user or org (using OAuth patterns).
 * @typedef {Object} ZoomAccount
 * @property id - The Zoom account ID that has given us authorization.
 * @property token - The Zoom `refresh_token` we can use to access Zoom APIs.
 * @property scopes - The scopes that `refresh_token` gives us access to.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/100}
 * @see {@link https://marketplace.zoom.us/docs/guides/auth/oauth}
 */
export const ZoomAccount = z.object({
  id: z.string(),
  token: z.string(),
  scopes: z.array(ZoomScope),
});

/**
 * An `Org` object represents a non-profit organization that is using Tutorbook
 * to manage their virtual tutoring programs.
 * @typedef {Object} Org
 * @property members - An array of user UIDs that are members of this org.
 * @property aspects - The supported aspects of a given org (i.e. are they more
 * focused on `tutoring` or `mentoring`). The first one listed is the default.
 * @property domains - Array of valid email domains that can access this org's
 * data (e.g. `pausd.us` and `pausd.org`).
 * @property profiles - Array of required profile fields (e.g. `phone`).
 * @property [zoom] - This org's Zoom OAuth config. Used to create meetings and
 * (optionally) users.
 * @property signup - Configuration for the org's unique custom sign-up page.
 * @property home - Configuration for the org's unique custom landing homepage.
 * @property booking - Configuration for the org's user booking pages.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/138}
 */
export const Org = Account.extend({
  members: z.array(z.string()).nonempty(),
  aspects: z.array(Aspect).nonempty(),
  domains: z.array(z.string()),
  profiles: z.array(z.string()),
  subjects: z.array(z.string()).optional(), 
  zoom: ZoomAccount.optional(), 
  signup: SignupConfig,
  home: HomeConfig,
  booking: BookingConfig,
});
