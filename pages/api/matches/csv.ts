import { NextApiRequest, NextApiResponse } from 'next';

import {
  MatchesQuery,
  MatchesQueryURL,
  isMatchesQueryURL,
} from 'lib/model';
import csv from 'lib/api/csv';
import getMatches from 'lib/api/get/matches';
import { handle } from 'lib/api/error';
import verifyAuth from 'lib/api/verify/auth';
import verifyQuery from 'lib/api/verify/query';

/**
 * GET - Downloads a CSV list of the filtered matches.
 *
 * Requires admin authentication.
 */
export default async function matches(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method as string} Not Allowed`);
    return;
  }

  try {
    const query = verifyQuery<MatchesQuery, MatchesQueryURL>(
      req.query,
      isMatchesQueryURL,
      MatchesQuery
    );

    // TODO: Update this using `paginationLimitedTo` or the `browseObjects` API
    // when we scale up (and have orgs with more than 1000 matches each).
    query.hitsPerPage = 1000;
    query.org = query.org || 'default';

    await verifyAuth(req.headers, { orgIds: [query.org] });

    const { results } = await getMatches(query);

    csv(
      res,
      'matches',
      results.map((meeting) => meeting.toCSV())
    );
  } catch (e) {
    handle(e, res);
  }
}
