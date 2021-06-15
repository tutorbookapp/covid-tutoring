import { z } from 'zod';

export const Aspect = z.union([
  z.literal('mentoring'),
  z.literal('tutoring'),
]);
