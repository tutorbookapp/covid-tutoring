import { z } from 'zod';

import { date } from 'lib/model/timeslot';

/**
 * The base interface for all of our data models.
 * @typedef {Object} Resource
 * @property created - When the resource was first created.
 * @property updated - The last time the resource was updated.
 */
export const Resource = z.object({
  created: date.default(() => new Date()),
  updated: date.default(() => new Date()),
});
