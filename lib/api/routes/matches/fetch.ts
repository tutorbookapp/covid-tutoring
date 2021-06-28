import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { MatchJSON } from 'lib/model/match';
import getMatch from 'lib/api/get/match';
import { handle } from 'lib/api/error';
import { matchToSegment } from 'lib/model/match';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchMatchRes = MatchJSON;

export default async function fetchMatch(
  req: Req,
  res: Res<FetchMatchRes>
): Promise<void> {
  try {
    const id = verifyQueryId(req.query);
    const match = await getMatch(id);

    const { uid } = await verifyAuth(req.headers, {
      userIds: match.people.map((p) => p.id),
      orgIds: [match.org],
    });

    res.status(200).json(match);

    segment.track({
      userId: uid,
      event: 'Match Fetched',
      properties: matchToSegment(match),
    });
  } catch (e) {
    handle(e, res);
  }
}
