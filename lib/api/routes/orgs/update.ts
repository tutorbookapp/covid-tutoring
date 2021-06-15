import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Org, OrgJSON, isOrgJSON } from 'lib/model/org';
import { accountToSegment } from 'lib/model/account';
import getOrg from 'lib/api/get/org';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import updateOrgDoc from 'lib/api/update/org-doc';
import updatePhoto from 'lib/api/update/photo';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';
import verifyMembersUnchanged from 'lib/api/verify/members-unchanged';

export type UpdateOrgRes = OrgJSON;

// TODO: Add API route specs that define what is able to be changed and what is
// not (e.g. here, you cannot change the org's members and for the `api/users`
// endpoint, you cannot change the user's email address).
export default async function updateOrg(
  req: Req,
  res: Res<UpdateOrgRes>
): Promise<void> {
  try {
    const body = verifyBody<Org, OrgJSON>(req.body, isOrgJSON, Org);
    const { uid } = await verifyAuth(req.headers, { orgIds: [body.id] });
    const prev = await getOrg(body.id);
    verifyMembersUnchanged(prev, body);
    const org = await updateOrgDoc(await updatePhoto(body, Org));
    res.status(200).json(org.toJSON());

    // TODO: Use `segment.group` calls to associate all admins with updated org.
    segment.track({
      userId: uid,
      event: 'Org Updated',
      properties: accountToSegment(org),
    });
  } catch (e) {
    handle(e, res);
  }
}
