import { z } from 'zod';

import { Timeslot } from 'lib/model/timeslot';

export const Availability = z.array(Timeslot);
export type Availability = z.infer<typeof Availability>;
export type AvailabilityJSON = z.input<typeof Availability>;
