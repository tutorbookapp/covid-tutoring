import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { MatchesQuery, MatchesQueryURL, isMatchesQueryURL } from 'lib/model/query/matches';
import { MatchJSON } from 'lib/model/match';
import getMatches from 'lib/api/get/matches';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQuery from 'lib/api/verify/query';

export interface ListMatchesRes {
  matches: MatchJSON[];
  hits: number;
}

export default async function listMatches(
  req: Req,
  res: Res<ListMatchesRes>
): Promise<void> {
  try {
    const query = verifyQuery<MatchesQuery, MatchesQueryURL>(
      req.query,
      isMatchesQueryURL,
      MatchesQuery
    );

    const { uid } = await verifyAuth(req.headers, {
      userIds: query.people.map((p) => p.value),
      orgIds: query.org ? [query.org] : undefined,
    });

    const { results, hits } = await getMatches(query);
    res.status(200).json({ hits, matches: results });

    segment.track({ userId: uid, event: 'Matches Listed' });
  } catch (e) {
    handle(e, res);
  }
}
