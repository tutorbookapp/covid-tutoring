import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Org, OrgJSON } from 'lib/model/org';
import { accountToSegment } from 'lib/model/account';
import createOrgDoc from 'lib/api/create/org-doc';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import updatePhoto from 'lib/api/update/photo';
import verifyAuth from 'lib/api/verify/auth';
import verifyIsOrgAdmin from 'lib/api/verify/is-org-admin';

export type CreateOrgRes = OrgJSON;

export default async function createOrg(
  req: Req,
  res: Res<CreateOrgRes>
): Promise<void> {
  try {
    const body = Org.parse(req.body);
    const { uid } = await verifyAuth(req.headers);
    verifyIsOrgAdmin(body, uid);
    const org = await createOrgDoc(await updatePhoto(body, Org));
    res.status(201).json(org);

    // TODO: Use `segment.group` calls to associate all admins with the new org.
    segment.track({
      userId: uid,
      event: 'Org Created',
      properties: accountToSegment(org),
    });
  } catch (e) {
    handle(e, res);
  }
}
