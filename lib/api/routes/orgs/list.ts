import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { OrgJSON } from 'lib/model/org';
import getOrgsByAdminId from 'lib/api/get/orgs-by-admin-id';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import verifyAuth from 'lib/api/verify/auth';

export type ListOrgsRes = OrgJSON[];

/**
 * Lists the orgs that you are an admin of.
 * @todo Perhaps we should rename this API route as it's much more opinionated
 * than one would expect (e.g. I would think, at first, that this just lists all
 * of the orgs on TB or something more general).
 */
export default async function listOrgs(
  req: Req,
  res: Res<ListOrgsRes>
): Promise<void> {
  try {
    const { uid } = await verifyAuth(req.headers);
    const orgs = await getOrgsByAdminId(uid);
    res.status(200).json(orgs);
    segment.track({ userId: uid, event: 'Orgs Listed' });
  } catch (e) {
    handle(e, res);
  }
}
