import { z } from 'zod';

/**
 * The base interface for all of our data models.
 * @typedef {Object} Resource
 * @property created - When the resource was first created.
 * @property updated - The last time the resource was updated.
 */
export const Resource = z.object({
  created: z.date(),
  updated: z.date(),
});
