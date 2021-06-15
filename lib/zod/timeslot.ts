import { z } from 'zod';

/**
 * A timeslot is a window of time and provides all the necessary scheduling data
 * for any scenario (including support for complex rrules used server-side).
 * @typedef {Object} TimeslotInterface
 * @property id - A unique identifier for this timeslot (used as React keys and
 * thus only stored client-side as we have no use for this on our server).
 * @property from - The start time of this particular timeslot instance.
 * @property to - The end time of this particular timeslot instance.
 * @property [exdates] - Dates to exclude from the timeslot's recurrence rule.
 * @property [recur] - The timeslot's recurrence rule (as an iCal RFC string).
 * @property [last] - The timeslot's last possible end time. Undefined
 * client-side; only used server-side for querying recurring timeslots.
 */
export const Timeslot = z.object({
  id: z.string(),
  from: z.date(),
  to: z.date(),
  exdates: z.array(z.date()).optional(),
  recur: z.string().optional(),
  last: z.date().optional(),
});
