import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import to from 'await-to-js';

import { UserJSON } from 'lib/model/user';
import { accountToSegment } from 'lib/model/account';
import definedVals from 'lib/model/defined-vals';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUser from 'lib/api/get/user';
import getUserHash from 'lib/api/get/user-hash';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
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
    const [err, attrs] = await to(
      verifyAuth(req.headers, { userId, orgIds: user.orgs })
    );
    res.status(200).json(
      definedVals({
        ...(err ? getTruncatedUser(user) : user).toJSON(),
        hash: attrs?.uid === userId ? getUserHash(userId) : undefined,
      })
    );

    if (attrs?.uid)
      segment.track({
        userId: attrs?.uid,
        event: 'User Fetched',
        properties: accountToSegment(user),
      });
  } catch (e) {
    handle(e, res);
  }
}
