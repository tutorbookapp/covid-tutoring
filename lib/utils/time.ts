import { Availability } from 'lib/model';
import { Timeslot } from 'lib/model';

/**
 * Checks if two dates are a certain number of months apart.
 * @param date - One of the dates to compare.
 * @param [other] - The other date to compare (defaults to now).
 * @return The number of months `date` is from `other` (can be negative).
 */
export function getMonthsApart(date: Date, other: Date = new Date()): number {
  const yearDiff = date.getFullYear() - other.getFullYear();
  const monthDiff = date.getMonth() - other.getMonth();
  return monthDiff + 12 * yearDiff;
}

/**
 * Checks if a date occurs on the same date as another.
 * @param date - The base date to compare against.
 * @param other - The other date to compare.
 * @return Whether or not the dates occur on the same year, month, and date.
 */
export function sameDate(date: Date, other: Date): boolean {
  return (
    date.getFullYear() === other.getFullYear() &&
    date.getMonth() === other.getMonth() &&
    date.getDate() === other.getDate()
  );
}

/**
 * Returns the number of days in a given month in a given year.
 * @param month - The month to get the number of days for (0 = January).
 * @param [year] - The year for which we want to inspect. Defaults to the
 * current one.
 * @return The number of days in the given month.
 * @see {@link https://stackoverflow.com/a/1184359}
 */
export function getDaysInMonth(month: number, year?: number): number {
  return new Date(year || new Date().getFullYear(), month + 1, 0).getDate();
}

/**
 * Returns the weekday of the first day of a given month in a given year.
 * @param month - The month to get the weekday of the first day (0 = January).
 * @param [year] - The year for which we want to inspect. Defaults to the
 * current one.
 * @return The weekday of the the first day in the given month (0 = Sunday).
 */
export function getWeekdayOfFirst(month: number, year?: number): number {
  return new Date(year || new Date().getFullYear(), month, 1).getDay();
}

/**
 * Returns the next date from 1970-01-01T00:00:00Z (the origin of the Unix
 * timestamp) or a given date that has the given times.
 * @see {@link https://en.wikipedia.org/wiki/Unix_time}
 * @param hours - The hours that the returned date should have.
 * @param [minutes=0] - The minutes that the returned date should have.
 * @param [seconds=0] - The seconds that the returned date should have.
 * @param [milliseconds=0] - The milliseconds that the returned date should have.
 * @param [reference] - The date we should start from. Default is UTC 0.
 */
export function getDateWithTime(
  hours: number,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
  reference = new Date(0)
): Date {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    hours,
    minutes,
    seconds,
    milliseconds
  );
}

/**
 * Returns the next date (from a given date) that has the given day (does not
 * change the times on the given date).
 * @param day - The integer representing the desired day (e.g. 0 for Sunday).
 * @param [reference] - The date we should start from. Default is UTC 0.
 * @todo Why do we have a counter (originally from `@tutorboook/utils`)?
 */
export function getDateWithDay(weekday: number, reference = new Date(0)): Date {
  const date = new Date(reference.valueOf());
  let count = 0; // TODO: Why did we add this counter in `lib/utils`?
  while (date.getDay() !== weekday && count <= 256) {
    date.setDate(date.getDate() + 1);
    count += 1;
  }
  return date;
}

/**
 * Helper function that combines `getDateWithTime` and `getNextDateWithDay` to
 * produce a function that returns a `Date` representing a weekly recurring
 * timestamp (i.e. the first occurance of the desired time as a Unix time).
 */
export function getDate(
  weekday: number,
  hours: number,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
  reference = new Date(0)
): Date {
  return getDateWithDay(
    weekday,
    getDateWithTime(hours, minutes, seconds, milliseconds, reference)
  );
}

/**
 * Gets the next date (in the future) with the given date's:
 * - Weekday (Mo/Tu/We/Thu/Fri/Sat/Sun)
 * - Time (HR:MIN:SS)
 * @param date - The date to match weekday and time.
 */
export function nextDateWithDayAndTime(date: Date): Date {
  return getDate(
    date.getDay(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
    new Date()
  );
}

/**
 * Returns the closest 15 min increment to a given start time but never goes
 * back in time (e.g. 9:41am becomes 9:45am, 9:56am becomes 10:00am).
 * @param start - The unrounded start time (e.g. 9:41am, 9:56am).
 * @param [interval] - The increment to round to in mins; default 15 mins.
 * @return The start time rounded up to the nearest 15 min interval.
 */
export function roundStartTime(start: Date, interval = 15): Date {
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getHours(),
    Math.ceil(start.getMinutes() / interval) * interval
  );
}

/**
 * Returns an array of timeslots of the given duration (default 30 mins) in the
 * given intervals (default 15 mins) between the given start and end times.
 * @param start - The start of the timeslot range (inclusive); will be rounded
 * to fit into the given interval.
 * @param end - The end of the timeslot range (inclusive).
 * @param [duration] - The timeslot duration in mins; default 30 mins.
 * @param [interval] - The time between each timeslot start time in mins;
 * default 15 mins.
 * @return An array of timeslots.
 */
export function getTimeslots(
  start: Date,
  end: Date,
  duration = 30,
  interval = 15
): Availability {
  const timeslots = new Availability();
  let from = roundStartTime(start, interval);
  while (from.valueOf() <= end.valueOf() - duration * 6e4) {
    const to = new Date(from.valueOf() + duration * 6e4);
    timeslots.push(new Timeslot({ from, to }));
    from = new Date(from.valueOf() + interval * 6e4);
  }
  return timeslots;
}

/**
 * Splits the given availability into 30 min timeslots in 15 min intervals. This
 * assumes there is no overlap between the given timeslots. Clones those weekly
 * timeslots into the requested month's date range.
 * @param baseline - The baseline, weekly availability.
 * @param month - The month to get timeslots for.
 * @param year - The year to get timeslots for.
 * @param [booked] - Booked availability slots (i.e. meeting times).
 * @param [from] - Any timeslots before this date will be excluded. Defaults to
 * right now (i.e. we only include timeslots in the future by default). You can
 * use this to enforce that lessons must be booked e.g. at least 3 days in
 * advance (i.e. preventing last minute bookings).
 * @param [to] - Any timeslots after this date will be excluded. Defaults to the
 * maximum possible date (see https://stackoverflow.com/a/43794682/10023158).
 * @return Availability full of 30 min timeslots in 15 min intervals for the
 * requested month's date range. Excludes timeslots from the past.
 */
export function getMonthsTimeslots(
  baseline: Availability,
  month: number,
  year: number,
  booked?: Availability,
  from: Date = new Date(),
  to: Date = new Date(8640000000000000)
): Availability {
  const timeslots = new Availability();

  // If month or year is before `from`, we know there are no timeslots.
  if (year < from.getFullYear()) return timeslots;
  if (year === from.getFullYear() && month < from.getMonth()) return timeslots;

  // If month or year is after `to`, we know there are no timeslots.
  if (year > to.getFullYear()) return timeslots;
  if (year === to.getFullYear() && month > to.getMonth()) return timeslots;

  const daysInMonth = getDaysInMonth(month, year);
  const weekdayOffset = getWeekdayOfFirst(month, year);

  // Split each of the availability timeslots into 30 min timeslots in 15 min
  // intervals. This assumes there is no overlap between the baseline timeslots.
  sliceAvailability(baseline).forEach((timeslot) => {
    const weekday = timeslot.from.getDay();
    const fromHrs = timeslot.from.getHours();
    const fromMins = timeslot.from.getMinutes();
    const toHrs = timeslot.to.getHours();
    const toMins = timeslot.to.getMinutes();
    // Clone those weekly recurring timeslots into the month's date range.
    let date = 1;
    while (date <= daysInMonth) {
      if ((date - 1 + weekdayOffset) % 7 === weekday) {
        const t = new Timeslot({
          from: new Date(year, month, date, fromHrs, fromMins),
          to: new Date(year, month, date, toHrs, toMins),
        });
        if (t.from >= from && t.to <= to && !booked?.overlaps(t, true))
          timeslots.push(t);
      }
      date += 1;
    }
  });

  return timeslots;
}

/**
 * Slices the given availability into timeslots of the given duration at given
 * intervals. Rounds the availability start to ensure round timeslot starts.
 * @param availability - The availability to slice into smaller timeslots.
 * @param [interval] - Minutes between slice start times. Defaults to 15 mins.
 * @param [duration] - The slice duration in minutes. Defaults to 60 mins.
 * @return The availability sliced into timeslots of the given duration whose
 * start times are each the given interval apart.
 */
export function sliceAvailability(
  availability: Availability,
  interval: number = 15,
  duration: number = 60
): Availability {
  const sliced = new Availability();
  const minsToMillis = 60 * 1000;
  availability.sort().forEach((timeslot) => {
    let from = roundStartTime(timeslot.from, interval);
    while (from.valueOf() <= timeslot.to.valueOf() - duration * minsToMillis) {
      const to = new Date(from.valueOf() + duration * minsToMillis);
      sliced.push(new Timeslot({ from, to }));
      from = new Date(from.valueOf() + interval * minsToMillis);
    }
  });
  return sliced;
}

/**
 * Generate the user's `_availability` for the next time window (e.g. 3 months).
 * Excludes a time when the user has meetings for every instance of that time in
 * the next time window (e.g. if a volunteer has a meeting on every Monday at 11
 * AM for the next 3 months, then we exclude Mondays at 11 AM).
 * @param availability - The user's availability (to slice and filter).
 * @param booked - Booked availability slots (i.e. meeting times).
 * @param [until] - The end date of the time window. Defaults to a date exactly
 * 3 months from now.
 * @param [interval] - Minutes between slice start times. Defaults to 15 mins.
 * @param [duration] - The slice duration in minutes. Defaults to 60 mins.
 * @return An array of valid timeslot start times to be stored in Algolia.
 */
export function getAlgoliaAvailability(
  availability: Availability,
  booked: Availability,
  until: Date,
  interval: number = 15,
  duration: number = 60
): number[] {
  const sliced = sliceAvailability(availability, interval, duration);
  const filtered = sliced.filter((timeslot) => {
    let from = nextDateWithDayAndTime(timeslot.from);
    while (from.valueOf() <= until.valueOf() + timeslot.duration) {
      const to = new Date(from.valueOf() + timeslot.duration);
      // If any one of the time's instances in the next 3 months can be booked
      // (i.e. it's not already booked), we include the time in Algolia.
      if (!booked.overlaps(new Timeslot({ from, to }), true)) return true;
      from = new Date(from.valueOf() + 7 * 24 * 60 * 60 * 1000);
    }
    // Otherwise, we know that every single one of the time's instances in the
    // next 3 months has been booked and thus exclude the time in Algolia.
    return false;
  });
  return Array.from(filtered.map((timeslot) => timeslot.from.valueOf()));
}
