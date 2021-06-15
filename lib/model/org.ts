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
 * An `Org` object represents a non-profit organization that is using Tutorbook
 * to manage their virtual tutoring programs.
 * @typedef {Object} Org
 * @property members - An array of user UIDs that are members of this org.
 * @property aspects - The supported aspects of a given org (i.e. are they more
 * focused on `tutoring` or `mentoring`). The first one listed is the default.
 * @property domains - Array of valid email domains that can access this org's
 * data (e.g. `pausd.us` and `pausd.org`).
 * @property profiles - Array of required profile fields (e.g. `phone`).
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
  signup: SignupConfig,
  home: HomeConfig,
  booking: BookingConfig,
});
export type Org = z.infer<typeof Org>;
export type OrgJSON = z.input<typeof Org>;
