import { z } from 'zod';

import { Timeslot } from 'lib/model/timeslot';

export const Availability = z.array(Timeslot);
export type Availability = z.infer<typeof Availability>;
export type AvailabilityJSON = z.input<typeof Availability>;

export function availabilityToString(
  availability: Availability, 
  locale = 'en',
  timeZone = 'America/Los_Angeles',
  showTimeZone = false
): string {
  return availability.map((t) => {
    const hideAMPM =
      (t.from.getHours() >= 12 && t.to.getHours() >= 12) ||
      (t.from.getHours() < 12 && t.to.getHours() < 12);
    const showSecondDate =
      t.from.getDate() !== t.to.getDate() ||
      t.from.getMonth() !== t.to.getMonth() ||
      t.from.getFullYear() !== t.to.getFullYear();

    // We follow Google's Material Design guidelines while formatting these
    // durations. We use an en dash without spaces between the time range.
    // @see {@link https://material.io/design/communication/data-formats.html}
    return `${t.from
      .toLocaleString(locale, {
        timeZone: timeZone || 'America/Los_Angeles',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
      })
      .replace(hideAMPM && !showSecondDate ? ' AM' : '', '')
      .replace(
        hideAMPM && !showSecondDate ? ' PM' : '',
        ''
      )}–${t.to.toLocaleString(locale, {
      timeZone: timeZone || 'America/Los_Angeles',
      weekday: showSecondDate ? 'long' : undefined,
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: showTimeZone ? 'short' : undefined,
    })}`;
  }).join(', ');
}
