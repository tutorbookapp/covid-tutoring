import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import to from 'await-to-js';

import { APIError, handle } from 'lib/api/error';
import { Meeting, MeetingJSON, meetingToSegment, isMeetingJSON } from 'lib/model/meeting';
import { Match, matchToSegment } from 'lib/model/match';
import analytics from 'lib/api/analytics';
import createMatchDoc from 'lib/api/create/match-doc';
import createMatchSearchObj from 'lib/api/create/match-search-obj';
import createMeetingDoc from 'lib/api/create/meeting-doc';
import createMeetingSearchObj from 'lib/api/create/meeting-search-obj';
import getLastTime from 'lib/api/get/last-time';
import getMatch from 'lib/api/get/match';
import getMeetingVenue from 'lib/api/get/meeting-venue';
import getOrg from 'lib/api/get/org';
import getPeople from 'lib/api/get/people';
import getPerson from 'lib/api/get/person';
import getStudents from 'lib/api/get/students';
import getUser from 'lib/api/get/user';
import logger from 'lib/api/logger';
import segment from 'lib/api/segment';
import sendEmails from 'lib/mail/meetings/create';
import updateAvailability from 'lib/api/update/availability';
import updateMatchTags from 'lib/api/update/match-tags';
import updateMeetingTags from 'lib/api/update/meeting-tags';
import updatePeopleTags from 'lib/api/update/people-tags';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';
import verifyIsOrgAdmin from 'lib/api/verify/is-org-admin';
import verifySubjectsCanBeTutored from 'lib/api/verify/subjects-can-be-tutored';
import verifyTimeInAvailability from 'lib/api/verify/time-in-availability';

export type CreateMeetingRes = MeetingJSON;

export default async function createMeeting(
  req: Req,
  res: Res<CreateMeetingRes>
): Promise<void> {
  try {
    const body = verifyBody<Meeting, MeetingJSON>(
      req.body,
      isMeetingJSON,
      Meeting
    );
    const people = await getPeople(body.match.people);

    logger.info(`Creating ${body.toString()}...`);

    // TODO: Actually implement availability verification.
    verifyTimeInAvailability(body.time, people);
    verifySubjectsCanBeTutored(body.match.subjects, people);

    const org = await getOrg(body.match.org);
    const creator = await getPerson(body.creator, people);
    await verifyAuth(req.headers, { userId: creator.id });

    // Verify the creator exists, is sending an authorized request, and:
    // - The creator is also the creator of the meeting's match (in which case
    //   we perform the match creator verification), OR;
    // - The meeting's match already exists (i.e. was created by someone else)
    //   and the creator is one of the original match people or an org admin.
    const [matchDoesntExist, originalMatch] = await to(getMatch(body.match.id));
    if (matchDoesntExist) {
      // Meeting creator is also the match creator.
      if (creator.id !== body.match.creator.id) {
        const msg = `You must be the match creator (${body.match.creator.id})`;
        throw new APIError(msg, 401);
      }

      // Verify the match creator is:
      // a) The match student him/herself, OR;
      // b) Parent of the match student, OR;
      // c) Admin of the match's org (e.g. Gunn High School).
      if (
        !getStudents(people).some(
          (p) => p.id === creator.id || p.parents.includes(creator.id)
        )
      )
        verifyIsOrgAdmin(org, creator.id);

      // Create match (b/c it doesn't already exist).
      body.match = await createMatchDoc(updateMatchTags(body.match));
      await createMatchSearchObj(body.match);

      segment.track({
        userId: creator.id,
        event: 'Match Created',
        properties: matchToSegment(body.match),
      });

      await Promise.all([
        analytics(body.match, 'created'),
        updatePeopleTags(people, { add: ['matched'] }),
      ]);
    } else {
      // Match org cannot change (security issue if it can).
      // TODO: Nothing in the match should be able to change (because this API
      // endpoint doesn't update any resources, it only creates them).
      if ((originalMatch as Match).org !== body.match.org) {
        const msg = `Match org (${org.toString()}) cannot change`;
        throw new APIError(msg, 400);
      }

      // Verify the meeting creator is:
      // a) One of the original match people, OR;
      // b) Admin of the original match's org (e.g. Gunn High School).
      const peopleIds = (originalMatch as Match).people.map((p) => p.id);
      if (!peopleIds.includes(creator.id)) verifyIsOrgAdmin(org, creator.id);
    }

    body.venue = getMeetingVenue(body, org, people);
    body.time.last = getLastTime(body.time);

    const meeting = await createMeetingDoc(updateMeetingTags(body));
    await createMeetingSearchObj(meeting);

    const orgAdmins = await Promise.all(org.members.map((id) => getUser(id)));
    await sendEmails(meeting, people, creator, org, orgAdmins);

    res.status(200).json(meeting.toJSON());

    logger.info(`Created ${meeting.toString()}.`);

    segment.track({
      userId: creator.id,
      event: 'Meeting Created',
      properties: meetingToSegment(meeting),
    });

    await Promise.all([
      analytics(meeting, 'created'),
      updatePeopleTags(people, { add: ['meeting'] }),
      ...people.map((p) => updateAvailability(p)),
    ]);
  } catch (e) {
    handle(e, res);
  }
}
