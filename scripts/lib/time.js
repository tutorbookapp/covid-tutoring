// Rewrite of the `lib/utils/time.ts` but in JavaScript for Node.js scripts.

/**
 * Returns the next date (from now or from a given date) that has the given
 * times.
 * @param hours - The hours that the returned date should have.
 * @param minutes - The minutes that the returned date should have.
 * @param seconds - The seconds that the returned date should have.
 * @param milliseconds - The milliseconds that the returned date should have.
 * @param [now] - The date we should start from. Default is right now.
 */
function getNextDateWithTime(
  hours,
  minutes,
  seconds,
  milliseconds,
  now = new Date()
) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    seconds,
    milliseconds
  );
}

/**
 * Returns the next date from 1970-01-01T00:00:00Z (the origin of the Unix
 * timestamp) that has the given times.
 * @see {@link https://en.wikipedia.org/wiki/Unix_time}
 * @param hours - The hours that the returned date should have.
 * @param [minutes=0] - The minutes that the returned date should have.
 * @param [seconds=0] - The seconds that the returned date should have.
 * @param [milliseconds=0] - The milliseconds that the returned date should
 * have.
 */
function getDateWithTime(hours, minutes = 0, seconds = 0, milliseconds = 0) {
  return getNextDateWithTime(
    hours,
    minutes,
    seconds,
    milliseconds,
    new Date(0)
  );
}

/**
 * Returns the next date (from a given date) that has the given day (does not
 * change the times on the given date).
 * @param day - The integer representing the desired day (e.g. 0 for Sunday).
 * @param [now] - The starting point and the date to get the time values
 * from (i.e. the hours, minutes, seconds, milliseconds, year, month, etc).
 * Default is right now.
 * @todo Why do we have a counter (originally from `@tutorboook/utils`)?
 */
function getNextDateWithDay(weekday, now = new Date()) {
  const date = new Date(now.valueOf());
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
function getDate(weekday, hours, minutes = 0, seconds = 0, milliseconds = 0) {
  const time = getDateWithTime(hours, minutes, seconds, milliseconds);
  return getNextDateWithDay(weekday, time);
}

/**
 * Returns the number of days in a given month in a given year.
 * @param month - The month to get the number of days for (0 = January).
 * @param [year] - The year for which we want to inspect. Defaults to the
 * current one.
 * @return The number of days in the given month.
 * @see {@link https://stackoverflow.com/a/1184359}
 */
function getDaysInMonth(month, year) {
  return new Date(year || new Date().getFullYear(), month + 1, 0).getDate();
}

/**
 * Returns the weekday of the first day of a given month in a given year.
 * @param month - The month to get the weekday of the first day (0 = January).
 * @param [year] - The year for which we want to inspect. Defaults to the
 * current one.
 * @return The weekday of the the first day in the given month (0 = Sunday).
 */
function getWeekdayOfFirst(month, year) {
  return new Date(year || new Date().getFullYear(), month, 1).getDay();
}

/**
 * Returns the closest 15 min increment to a given start time but never goes
 * back in time (e.g. 9:41am becomes 9:45am, 9:56am becomes 10:00am).
 * @param start - The unrounded start time (e.g. 9:41am, 9:56am).
 * @param [interval] - The increment to round to in mins; default 15 mins.
 * @return The start time rounded up to the nearest 15 min interval.
 */
function roundStartTime(start, interval = 15) {
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getHours(),
    Math.ceil(start.getMinutes() / interval) * interval
  );
}

/**
 * Splits the given availability into 30 min timeslots in 15 min intervals. This
 * assumes there is no overlap between the given timeslots. Clones those weekly
 * timeslots into the requested month's date range.
 * @param baseline - The baseline, weekly availability.
 * @param month - The month to get timeslots for.
 * @param year - The year to get timeslots for.
 * @return Availability full of 30 min timeslots in 15 min intervals for the
 * requested month's date range.
 */
function getMonthsTimeslots(baseline, month, year) {
  const interval = 15;
  const duration = 30;
  const daysInMonth = getDaysInMonth(month, year);
  const weekdayOffset = getWeekdayOfFirst(month, year);

  // Split each of the availability timeslots into 30 min timeslots in 15 min
  // intervals. This assumes there is no overlap between the baseline timeslots.
  const timeslots = [];
  baseline.sort().forEach((timeslot) => {
    let from = roundStartTime(timeslot.from, interval);
    while (from.valueOf() <= timeslot.to.valueOf() - duration * 6e4) {
      const weekday = from.getDay();
      const fromHrs = from.getHours();
      const fromMins = from.getMinutes();
      const to = new Date(from.valueOf() + duration * 6e4);
      const toHrs = to.getHours();
      const toMins = to.getMinutes();
      // Clone those weekly recurring timeslots into the month's date range.
      let date = 1;
      while (date <= daysInMonth) {
        if ((date - 1 + weekdayOffset) % 7 === weekday)
          timeslots.push({
            from: new Date(year, month, date, fromHrs, fromMins),
            to: new Date(year, month, date, toHrs, toMins),
          });
        date += 1;
      }
      from = new Date(from.valueOf() + interval * 6e4);
    }
  });

  return timeslots;
}

function full(month, year) {
  const full = [];
  Array(7)
    .fill(null)
    .forEach((_, idx) =>
      full.push({
        from: getDate(idx, 0),
        to: getDate(idx, 23, 30),
      })
    );
  return getMonthsTimeslots(full, month, year);
}

module.exports = {
  full,
  getMonthsTimeslots,
  getWeekdayOfFirst,
  getDaysInMonth,
  getDate,
};
