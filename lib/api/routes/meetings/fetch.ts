import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { MeetingJSON } from 'lib/model/meeting';
import getMatch from 'lib/api/get/match';
import getMatchMeetings from 'lib/api/get/match-meetings';
import { handle } from 'lib/api/error';
import { matchToSegment } from 'lib/model/match';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchMeetingsRes = MeetingJSON[];

export default async function fetchMeetings(
  req: Req,
  res: Res<FetchMeetingsRes>
): Promise<void> {
  try {
    const id = verifyQueryId(req.query);
    const [match, meetings] = await Promise.all([
      getMatch(id),
      getMatchMeetings(id),
    ]);

    const { uid } = await verifyAuth(req.headers, {
      userIds: match.people.map((p) => p.id),
      orgIds: [match.org],
    });

    res.status(200).json(meetings.map((m) => m.toJSON()));

    segment.track({
      userId: uid,
      event: 'Match Meetings Fetched',
      properties: matchToSegment(match),
    });
  } catch (e) {
    handle(e, res);
  }
}
