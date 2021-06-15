import { z } from 'zod';

import { Resource } from 'lib/model/resource';

/**
 * A check is a single aspect of a verification.
 * @example
 * - A verified university email address (e.g. `@stanford.edu`).
 * - A verified normal email address.
 * - A verified social (@see {@link SocialTypeAlias}) account (e.g. LinkedIn).
 * - A DBS check on file.
 */
export const Check = z.union([
  z.literal('email'),
  z.literal('background-check'),
  z.literal('academic-email'),
  z.literal('training'),
  z.literal('interview'),
]);
export type Check = z.infer<typeof Check>;

/**
 * A verification is run by a non-profit organization (the `org`) by a member of
 * that organization (the `creator`). The non-profit takes full responsibility 
 * for their verification and liability for the user's actions.
 * @typedef {Object} Verification
 * @extends Resource
 * @property creator - The uID of the user who ran the verification.
 * @property org - The id of the non-profit org that the `creator` belongs to.
 * @property notes - Any notes about the verification (e.g. what happened).
 * @property checks - An array of checks (@see {@link Check}) passed.
 */
export const Verification = Resource.extend({
  creator: z.string().default(''),
  org: z.string().default('default'),
  notes: z.string().default(''),
  checks: z.array(Check).default([]),
});
export type Verification = z.infer<typeof Verification>;
