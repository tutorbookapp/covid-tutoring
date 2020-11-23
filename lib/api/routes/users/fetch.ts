import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import to from 'await-to-js';

import { UserJSON } from 'lib/model';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUser from 'lib/api/get/user';
import getUserHash from 'lib/api/get/user-hash';
import { handle } from 'lib/api/error';
import verifyAuth from 'lib/api/verify/auth';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchUserRes = UserJSON;

export default async function fetchUser(
  req: Req,
  res: Res<FetchUserRes>
): Promise<void> {
  try {
    const userId = verifyQueryId(req.query);
    const user = await getUser(userId);
    const [err, uid] = await to(
      verifyAuth(req.headers, { userId, orgIds: user.orgs })
    );
    res.status(200).json({
      ...(err ? getTruncatedUser(user) : user).toJSON(),
      hash: uid === userId ? getUserHash(uid) : null,
    });
  } catch (e) {
    handle(e, res);
  }
}
