import { z } from 'zod';

import { Timeslot } from 'lib/model/timeslot';

export const Availability = z.array(Timeslot);
