import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { APIError, handle } from 'lib/api/error';
import { MeetingsQuery, MeetingsQueryURL, isMeetingsQueryURL } from 'lib/model/query/meetings';
import { MeetingJSON } from 'lib/model/meeting';
import getMeetings from 'lib/api/get/meetings';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQuery from 'lib/api/verify/query';

export interface ListMeetingsRes {
  meetings: MeetingJSON[];
  hits: number;
}

export default async function listMeetings(
  req: Req,
  res: Res<ListMeetingsRes>
): Promise<void> {
  try {
    const query = verifyQuery<MeetingsQuery, MeetingsQueryURL>(
      req.query,
      isMeetingsQueryURL,
      MeetingsQuery
    );

    // User must be either:
    // a) An org admin of the matches requested, OR;
    // b) The person whose matches are being requested.
    if (query.people.length !== 1 && !query.org)
      throw new APIError('You must filter meetings by org or people', 400);
    const { uid } = await verifyAuth(req.headers, {
      userId: query.people.length === 1 ? query.people[0].value : undefined,
      orgIds: query.org ? [query.org] : undefined,
    });

    const { results, hits } = await getMeetings(query);
    res.status(200).json({ hits, meetings: results });

    segment.track({ userId: uid, event: 'Meetings Listed' });
  } catch (e) {
    handle(e, res);
  }
}
