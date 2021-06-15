import { RRule, RRuleSet } from 'rrule';
import { nanoid } from 'nanoid';

import {
  addArrayFilter,
  addOptionsFilter,
  addStringFilter,
  list,
} from 'lib/api/search';
import { Meeting } from 'lib/model/meeting';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { Timeslot } from 'lib/model/timeslot';

function getFilterStrings(query: MeetingsQuery): string[] {
  let str = query.org ? `match.org:${query.org}` : '';
  str = addOptionsFilter(str, query.people, 'match.people.id', 'OR');
  str = addOptionsFilter(str, query.subjects, 'match.subjects', 'OR');
  str = addArrayFilter(str, query.tags, '_tags');

  const to = query.to.valueOf();
  const from = query.from.valueOf();

  const endWithin = `time.last >= ${from} AND time.last <= ${to}`;
  const startWithin = `time.from >= ${from} AND time.from <= ${to}`;

  return [
    // Start is before window but end is within.
    addStringFilter(str, `(time.from < ${from} AND ${endWithin})`),
    // Both start and end are within window.
    addStringFilter(str, `(${startWithin} AND ${endWithin})`),
    // End is after window but start is within.
    addStringFilter(str, `(time.last > ${to} AND ${startWithin})`),
    // Start is before window and end is after.
    addStringFilter(str, `(time.from < ${from} AND time.last > ${to})`),
  ];
}

// TODO: Generate instance meetings (from recurring parent meetings returned by
// query) within requested time window and send those to the client.
export default async function getMeetings(
  query: MeetingsQuery
): Promise<{ hits: number; results: Meeting[] }> {
  const filters = getFilterStrings(query);
  const data = await list('meetings', query, Meeting.fromSearchHit, filters);
  let { hits } = data;
  const meetings = data.results.map((meeting) => {
    if (!meeting.time.recur) return [meeting];
    const options = RRule.parseString(meeting.time.recur);
    const rruleset = new RRuleSet();
    rruleset.rrule(new RRule({ ...options, dtstart: meeting.time.from }));
    (meeting.time.exdates || []).forEach((d) => rruleset.exdate(d));
    // TODO: What if meeting instance starts before window but end is within?
    const startTimes = rruleset.between(query.from, query.to);
    hits += startTimes.length - 1;
    return startTimes.map((startTime) => {
      if (startTime.valueOf() === meeting.time.from.valueOf()) return meeting;
      const to = new Date(startTime.valueOf() + meeting.time.duration);
      return Meeting.parse({
        ...meeting,
        id: nanoid(),
        parentId: meeting.id,
        time: Timeslot.parse({ ...meeting.time, to, from: startTime }),
      });
    });
  });
  return { hits, results: meetings.flat() };
}
