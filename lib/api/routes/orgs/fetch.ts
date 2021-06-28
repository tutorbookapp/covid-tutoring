import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { OrgJSON } from 'lib/model/org';
import getOrg from 'lib/api/get/org';
import { handle } from 'lib/api/error';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchOrgRes = OrgJSON;

export default async function fetchOrg(
  req: Req,
  res: Res<FetchOrgRes>
): Promise<void> {
  try {
    const id = verifyQueryId(req.query);
    res.status(200).json((await getOrg(id)));
  } catch (e) {
    handle(e, res);
  }
}
