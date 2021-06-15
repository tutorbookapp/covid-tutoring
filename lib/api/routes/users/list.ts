import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import to from 'await-to-js';

import { User, UserJSON } from 'lib/model/user';
import { UsersQuery, UsersQueryURL, isUsersQueryURL } from 'lib/model/query/users';
import getOrgsByAdminId from 'lib/api/get/orgs-by-admin-id';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUsers from 'lib/api/get/users';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';
import verifyQuery from 'lib/api/verify/query';

export interface ListUsersRes {
  users: UserJSON[];
  hits: number;
}

export default async function listUsers(
  req: Req,
  res: Res<ListUsersRes>
): Promise<void> {
  try {
    const query = verifyQuery<UsersQuery, UsersQueryURL>(
      req.query,
      isUsersQueryURL,
      UsersQuery
    );
    const { results, hits } = await getUsers(query);

    // Conditionally truncate user data; only certain people can see others'
    // sensitive contact info, full names, etc.
    const [err, attrs] = await to(verifyAuth(req.headers));
    let users: User[];
    if (err) {
      users = results.map(getTruncatedUser);
    } else {
      const { uid } = attrs as { uid: string };
      const orgIds = (await getOrgsByAdminId(uid)).map((o) => o.id);
      users = results.map((r) => {
        if (r.id === uid) return r;
        if (r.parents.includes(uid)) return r;
        if (r.orgs.some((orgId) => orgIds.includes(orgId))) return r;
        return getTruncatedUser(r);
      });
      
      // TODO: Include the query info as event properties here.
      segment.track({ userId: uid, event: 'Users Listed' });
    }

    res.status(200).json({ hits, users: users.map((u) => u.toJSON()) });
  } catch (e) {
    handle(e, res);
  }
}
