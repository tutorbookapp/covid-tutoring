import { NextApiRequest, NextApiResponse } from 'next';

import {
  MeetingsQuery,
  MeetingsQueryURL,
  isMeetingsQueryURL,
} from 'lib/model';
import csv from 'lib/api/csv';
import getMeetings from 'lib/api/get/meetings';
import { handle } from 'lib/api/error';
import verifyAuth from 'lib/api/verify/auth';
import verifyQuery from 'lib/api/verify/query';

/**
 * GET - Downloads a CSV list of the filtered meetings.
 *
 * Requires admin authentication.
 */
export default async function meetings(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method as string} Not Allowed`);
    return;
  }

  try {
    const query = verifyQuery<MeetingsQuery, MeetingsQueryURL>(
      req.query,
      isMeetingsQueryURL,
      MeetingsQuery
    );

    // TODO: Update this using `paginationLimitedTo` or the `browseObjects` API
    // when we scale up (and have orgs with more than 1000 meetings per week).
    query.hitsPerPage = 1000;
    query.org = query.org || 'default';

    await verifyAuth(req.headers, { orgIds: [query.org] });

    const { results } = await getMeetings(query);

    csv(
      res,
      'meetings',
      results.map((meeting) => meeting.toCSV())
    );
  } catch (e) {
    handle(e, res);
  }
}
