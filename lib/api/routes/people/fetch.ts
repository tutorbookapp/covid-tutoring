import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { UserJSON } from 'lib/model/user';
import getMatch from 'lib/api/get/match';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUser from 'lib/api/get/user';
import { handle } from 'lib/api/error';
import { matchToSegment } from 'lib/model/match';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchPeopleRes = UserJSON[];

export default async function fetchPeople(
  req: Req,
  res: Res<FetchPeopleRes>
): Promise<void> {
  try {
    const id = verifyQueryId(req.query);
    const match = await getMatch(id);

    const { uid, adminOf } = await verifyAuth(req.headers, {
      userIds: match.people.map((p) => p.id),
      orgIds: [match.org],
    });
    const users = await Promise.all(
      match.people.map(async (p) => {
        const user = await getUser(p.id);
        if (user.id === uid) return user;
        if (user.parents.includes(uid)) return user;
        if (user.orgs.some((o) => adminOf?.includes(o))) return user;
        return getTruncatedUser(user);
      })
    );
    const people = users.map((u) => {
      const ps = match.people[match.people.findIndex((p) => p.id === u.id)];
      return { ...u, roles: ps?.roles || [] };
    });

    res.status(200).json(people);

    segment.track({
      userId: uid,
      event: 'Match People Fetched',
      properties: matchToSegment(match),
    });
  } catch (e) {
    handle(e, res);
  }
}
