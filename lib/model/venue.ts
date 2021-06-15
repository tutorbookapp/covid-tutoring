import { z } from 'zod';

import { Resource } from 'lib/model/resource';

/**
 * A venue for a tutoring or mentoring match to occur (e.g. Zoom or Jitsi).
 * @typedef {Object} Venue
 * @extends Resource
 * @property url - The URL of the venue (right now, all venues are online and
 * thus have a definitive URL).
 */
export const Venue = Resource.extend({
  id: z.string(),
  url: z.string().url(),
});
export type Venue = z.infer<typeof Venue>;
