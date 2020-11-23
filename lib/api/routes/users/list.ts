import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import to from 'await-to-js';

import {
  UserJSON,
  UsersQuery,
  UsersQueryURL,
  isUsersQueryURL,
} from 'lib/model';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUsers from 'lib/api/get/users';
import { handle } from 'lib/api/error';
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
    const { users, hits } = await getUsers(query);
    const [err] = await to(
      verifyAuth(req.headers, { orgIds: query.orgs.map((o) => o.value) })
    );
    res.status(200).json({
      hits,
      users: (err ? users.map(getTruncatedUser) : users).map((u) => u.toJSON()),
    });
  } catch (e) {
    handle(e, res);
  }
}
