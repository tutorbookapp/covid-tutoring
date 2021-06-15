import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { APIError, handle } from 'lib/api/error';
import { Analytics } from 'lib/model/analytics';
import { db } from 'lib/api/firebase';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQueryId from 'lib/api/verify/query-id';

/**
 * @typedef {Object} AnalyticsSnapshot
 * @description Snapshot of analytics at a given point in time.
 * @property date - The date in milliseconds form.
 * @property volunteers - Total number of volunteers.
 * @property students - Total number of students.
 * @property matches - Total number of matches.
 * @property meetings - Total number of meetings.
 */
export interface AnalyticsSnapshot {
  date: number;
  volunteers: number;
  students: number;
  matches: number;
  meetings: number;
}

/**
 * @typedef {Object} AnalyticsRes
 * @description Data that powers the org overview page. Calculated based on the
 * `Analytics` objects stored in the `/org/<orgId>/analytics` subcollection.
 */
export interface AnalyticsRes {
  volunteers: { change: number; total: number; matched: number };
  students: { change: number; total: number; matched: number };
  matches: { change: number; total: number; perVolunteer: number };
  meetings: { change: number; total: number; recurring: number };
  timeline: AnalyticsSnapshot[];
}

/**
 * Calculates in percent (1 decimal), the change between 2 numbers.
 * e.g. from 1000 to 500 = 50%
 *
 * We subjectively report 100% values when the old number is 0.
 * e.g. from 0 to 10 = 100%
 * e.g. from 0 to -10 = -100%
 * e.g. from 0 to 0 = 0%
 *
 * @param oldNumber - The initial value.
 * @param newNumber - The value that changed.
 */
function getPercentChange(oldNumber: number, newNumber: number): number {
  if (oldNumber === 0) {
    if (newNumber > 0) return 100;
    if (newNumber < 0) return -100;
    if (newNumber === 0) return 0;
  }
  return Math.round(((newNumber - oldNumber) / oldNumber) * 1000) / 10;
}

/**
 * GET - Fetches the data for the org's overview page.
 *
 * Requires an authentication JWT belonging to a member of the org in question.
 */
export default async function analytics(
  req: Req,
  res: Res<APIError | AnalyticsRes>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method as string} Not Allowed`);
  } else {
    try {
      // Get last three months of data from the analytics subcollection.
      const orgId = verifyQueryId(req.query);
      const { uid } = await verifyAuth(req.headers, { orgIds: [orgId] });
      const { docs } = await db
        .collection('orgs')
        .doc(orgId)
        .collection('analytics')
        .orderBy('date', 'desc')
        .where('date', '>=', new Date(new Date().valueOf() - 78894e5))
        .get();

      // Analytics snapshots going backwards in time (i.e. latest first).
      const timeline = docs
        .map(Analytics.fromFirestoreDoc)
        .sort((a, b) => b.date.valueOf() - a.date.valueOf());

      // Calculate the percent change from last week's data (i.e. the latest
      // data from at least a week ago).
      const current = timeline[0] || new Analytics();
      const lastWeekDate = new Date().valueOf() - 6048e5;
      const lastWeek =
        timeline.find((d) => d.date.valueOf() <= lastWeekDate) || current;

      res.status(200).json({
        volunteers: {
          change: getPercentChange(
            lastWeek.volunteer.total,
            current.volunteer.total
          ),
          total: current.volunteer.total,
          matched: current.volunteer.matched,
        },
        students: {
          change: getPercentChange(
            lastWeek.student.total,
            current.student.total
          ),
          total: current.student.total,
          matched: current.student.matched,
        },
        matches: {
          change: getPercentChange(lastWeek.match.total, current.match.total),
          total: current.match.total,
          // TODO: This "average per volunteer" statistic is *really* hacky and
          // isn't really the mean of the # of matches each volunteer have.
          perVolunteer: Math.round(
            current.match.total / current.volunteer.matched
          ),
        },
        meetings: {
          change: getPercentChange(
            lastWeek.meeting.total,
            current.meeting.total
          ),
          total: current.meeting.total,
          recurring: current.meeting.recurring,
        },
        timeline: timeline.reverse().map((a) => ({
          date: a.date.valueOf(),
          volunteers: a.volunteer.total,
          students: a.student.total,
          matches: a.match.total,
          meetings: a.meeting.total,
        })),
      });

      segment.track({ userId: uid, event: 'Analytics Fetched' });
    } catch (e) {
      handle(e, res);
    }
  }
}
