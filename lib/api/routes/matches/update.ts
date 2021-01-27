import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Match, MatchJSON, isMatchJSON } from 'lib/model';
import getPeople from 'lib/api/get/people';
import { handle } from 'lib/api/error';
import updateMatchDoc from 'lib/api/update/match-doc';
import updateMatchSearchObj from 'lib/api/update/match-search-obj';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';
import verifyDocExists from 'lib/api/verify/doc-exists';
import verifySubjectsCanBeTutored from 'lib/api/verify/subjects-can-be-tutored';

export type UpdateMatchRes = MatchJSON;

export default async function updateMatch(
  req: Req,
  res: Res<UpdateMatchRes>
): Promise<void> {
  try {
    const body = verifyBody<Match, MatchJSON>(req.body, isMatchJSON, Match);

    await verifyDocExists('matches', body.id);

    const people = await getPeople(body.people);

    verifySubjectsCanBeTutored(body.subjects, people);

    // TODO: Compare the previous data with the requested updates to ensure that
    // the creator hasn't changed (if it has, users could bypass these checks).
    await verifyAuth(req.headers, {
      userIds: body.people.map((p) => p.id),
      orgIds: [body.org],
    });

    await Promise.all([updateMatchDoc(body), updateMatchSearchObj(body)]);

    res.status(200).json(body.toJSON());
  } catch (e) {
    handle(e, res);
  }
}
