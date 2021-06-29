import { z } from 'zod';

export const Role = z.union([
  z.literal('tutor'),
  z.literal('tutee'),
  z.literal('mentor'),
  z.literal('mentee'),
  z.literal('parent'),
]);
export type Role = z.infer<typeof Role>;

/**
 * Represents a person that is involved in a request or match. Here, roles are
 * explicitly listed (unlike the `User` object where roles are implied by
 * role-specific properties).
 * @property id - The user's unique Firebase-assigned user ID.
 * @property [name] - The user's name (so we don't have to query an API just to
 * show an intelligible representation of this person).
 * @property [photo] - The user's photo URL (if any). This is included for the
 * same reason as above; speed on the front-end rendering. If not added by the
 * front-end, this is always updated by our back-end GCP function (triggered
 * when user documents are updated so as to keep profile info in sync).
 * @property roles - The user's roles in this request or match (e.g. `tutor`).
 */
export const Person = z.object({
  id: z.string().default(''), 
  name: z.string().default(''), 
  photo: z.string().url().default(''),
  roles: z.array(Role).default([]), 
});
export type Person = z.infer<typeof Person>;
