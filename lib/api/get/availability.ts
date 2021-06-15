import { Availability } from 'lib/model/availability';
import { MeetingsQuery } from 'lib/model/query/meetings';
import getMeetings from 'lib/api/get/meetings';
import { getMonthsTimeslots } from 'lib/utils/time';
import getUser from 'lib/api/get/user';

/**
 * Calculates the user's availability for a given month and returns an array of
 * 30 min timeslots in 15 min increments. This considers the following:
 * 1. User defined "working hours" (i.e. the weekly recurring `availability`
 *    specified in his/her profile document).
 * 2. Matches and their weekly recurring `time`.
 * @param uid - The ID of the user whose availability we want to fetch.
 * @param month - The month to get timeslots for.
 * @param year - The year to get timeslots for.
 * @return An array of 30 min timeslots in 15 increments on the given month.
 */
export default async function getAvailability(
  uid: string,
  month: number,
  year: number
): Promise<Availability> {
  // 1. Start with a baseline weekly recurring availability.
  const { availability: baseline } = await getUser(uid);

  // 2. Remove the weekly recurring match times from that availability.
  const query = MeetingsQuery.parse({
    people: [{ label: '', value: uid }],
    from: new Date(year, month, 0),
    to: new Date(year, month + 1, 0),
  });
  const meetings = (await getMeetings(query)).results;
  const booked = Availability.parse(meetings.map((m) => m.time));

  // 3. Enforce that lessons must be booked at least 3 days in advance and
  // cannot be booked more than 30 days into the future.
  // @see {@link https://github.com/tutorbookapp/tutorbook/issues/197}
  const from = new Date(new Date().valueOf() + 3 * 24 * 60 * 60 * 1000);
  const to = new Date(new Date().valueOf() + 30 * 24 * 60 * 60 * 1000);

  // 4. Split each of the availability timeslots into 30 min timeslots in 15 min
  // intervals. This assumes there is no overlap between the baseline timeslots.
  return getMonthsTimeslots(baseline, month, year, booked, from, to);
}
