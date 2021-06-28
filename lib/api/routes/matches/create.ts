import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Match, MatchJSON, matchToSegment } from 'lib/model/match';
import analytics from 'lib/api/analytics';
import createMatchDoc from 'lib/api/create/match-doc';
import createMatchSearchObj from 'lib/api/create/match-search-obj';
import getOrg from 'lib/api/get/org';
import getPeople from 'lib/api/get/people';
import getPerson from 'lib/api/get/person';
import getStudents from 'lib/api/get/students';
import { handle } from 'lib/api/error';
import logger from 'lib/api/logger';
import segment from 'lib/api/segment';
import updateMatchTags from 'lib/api/update/match-tags';
import updatePeopleTags from 'lib/api/update/people-tags';
import verifyAuth from 'lib/api/verify/auth';
import verifyIsOrgAdmin from 'lib/api/verify/is-org-admin';
import verifySubjectsCanBeTutored from 'lib/api/verify/subjects-can-be-tutored';

export type CreateMatchRes = MatchJSON;

/**
 * Creates a new match: A pairing of people (typically between a student and a
 * tutor/mentor).
 * @todo Don't error when a creator is unavailable during the requested time
 * (or, even better, add this timeslot to their availability and then remove it
 * during post-creation logic).
 */
export default async function createMatch(
  req: Req,
  res: Res<CreateMatchRes>
): Promise<void> {
  try {
    const body = Match.parse(req.body);
    const people = await getPeople(body.people);

    logger.info(`Creating ${body.toString()}...`);

    verifySubjectsCanBeTutored(body.subjects, people);

    // Verify the creator exists and is sending an authorized request.
    const creator = await getPerson(body.creator, people);
    await verifyAuth(req.headers, { userId: creator.id });

    // Verify the match creator is:
    // a) The match student him/herself, OR;
    // b) Parent of the match student, OR;
    // c) Admin of the match's org (e.g. Gunn High School).
    if (
      !getStudents(people).some(
        (p) => p.id === creator.id || p.parents.includes(creator.id)
      )
    )
      verifyIsOrgAdmin(await getOrg(body.org), creator.id);

    const match = await createMatchDoc(updateMatchTags(body));
    await createMatchSearchObj(match);

    logger.info(`Created ${match.toString()}.`);

    res.status(201).json(match);

    segment.track({
      userId: creator.id,
      event: 'Match Created',
      properties: matchToSegment(match),
    });

    await Promise.all([
      analytics(match, 'created'),
      updatePeopleTags(people, { add: ['matched'] }),
    ]);
  } catch (e) {
    handle(e, res);
  }
}
