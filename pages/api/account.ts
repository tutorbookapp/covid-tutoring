import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import { dequal } from 'dequal/lite';
import to from 'await-to-js';

import {
  Availability,
  SocialInterface,
  Subjects,
  User,
  UserJSON,
  isUserJSON,
} from 'lib/model';
import clone from 'lib/utils/clone';
import getUser from 'lib/api/get/user';
import { handle } from 'lib/api/error';
import updateAuthUser from 'lib/api/update/auth-user';
import updatePhoto from 'lib/api/update/photo';
import updateUserDoc from 'lib/api/update/user-doc';
import updateUserOrgs from 'lib/api/update/user-orgs';
import updateUserSearchObj from 'lib/api/update/user-search-obj';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';

function mergeSocials(
  overrides: SocialInterface[],
  baseline: SocialInterface[]
): SocialInterface[] {
  const socials = clone(overrides);
  baseline.forEach((s) => {
    if (!socials.some((sc) => sc.type === s.type)) socials.push(clone(s));
  });
  return socials;
}

function mergeArrays<T>(overrides: T[], baseline: T[]): T[] {
  const merged = clone(overrides);
  baseline.forEach((i) => {
    if (!merged.some((im) => dequal(im, i))) merged.push(clone(i));
  });
  return merged;
}

// TODO: Implement a more sophisticated merging of e.g. overlapping timeslots.
function mergeAvailability(
  overrides: Availability,
  baseline: Availability
): Availability {
  return new Availability(...mergeArrays(overrides, baseline));
}

function mergeSubjects(overrides: Subjects, baseline: Subjects): Subjects {
  return {
    subjects: mergeArrays(overrides.subjects, baseline.subjects),
    searches: mergeArrays(overrides.searches, baseline.searches),
  };
}

/**
 * Merges the two users giving priority to `overrides` without any loss of data.
 * @param overrides - The 1st priority data that will override `baseline`.
 * @param baseline - The 2nd priority data that will be overriden.
 * @return A user object that fills in as many fields as possible; first takes
 * from `overrides` and fallbacks to taking from `baseline`.
 */
function mergeUsers(overrides: User, baseline: User): User {
  return new User({
    id: overrides.id || baseline.id,
    name: overrides.name || baseline.name,
    photo: overrides.photo || baseline.photo,
    email: overrides.email || baseline.email,
    phone: overrides.phone || baseline.phone,
    bio: overrides.bio || baseline.bio,
    socials: mergeSocials(overrides.socials, baseline.socials),
    orgs: mergeArrays(overrides.orgs, baseline.orgs),
    zooms: mergeArrays(overrides.zooms, baseline.zooms),
    availability: mergeAvailability(
      overrides.availability,
      baseline.availability
    ),
    mentoring: mergeSubjects(overrides.mentoring, baseline.mentoring),
    tutoring: mergeSubjects(overrides.tutoring, baseline.tutoring),
    langs: mergeArrays(overrides.langs, baseline.langs),
    parents: mergeArrays(overrides.parents, baseline.parents),
    verifications: mergeArrays(overrides.verifications, baseline.verifications),
    visible: overrides.visible || baseline.visible,
    featured: mergeArrays(overrides.featured, baseline.featured),
  });
}

async function updateAccount(req: Req, res: Res): Promise<void> {
  const body = verifyBody<User, UserJSON>(req.body, isUserJSON, User);

  // Revert to old behavior if user doesn't already exist; just create it.
  const user = (await to(getUser(body.id)))[1];

  // Merge the two users giving priority to the request body (but preventing any
  // loss of data; `mergeUsers` won't allow falsy values or empty arrays).
  const merged = mergeUsers(body, user || new User());

  // TODO: Check the existing data, not the data that is being sent with the
  // request (e.g. b/c I could fake data and add users to my org).
  await verifyAuth(req.headers, { userId: merged.id, orgIds: merged.orgs });
  await updatePhoto(updateUserOrgs(merged));

  const updated = await updateUserDoc(await updateAuthUser(merged));
  await updateUserSearchObj(updated);
  res.status(200).json(updated.toJSON());
}

async function getAccount(req: Req, res: Res): Promise<void> {
  const uid = await verifyAuth(req.headers);
  res.statusCode = 302;
  res.setHeader('Location', `/api/users/${uid}`);
  res.end();
}

/**
 * GET - Fetches the profile data of the user who own's the given JWT.
 * PUT - Updates (or creates) the user's profile data; this differs from the
 *       default PUT 'api/users' endpoint as it merges the given data with any
 *       existing data to prevent data loss (e.g. so users can claim their
 *       existing profiles).
 *
 * Requires a JWT; will return the profile data of that user.
 */
export default async function account(req: Req, res: Res): Promise<void> {
  try {
    switch (req.method) {
      case 'GET':
        await getAccount(req, res);
        break;
      case 'PUT':
        await updateAccount(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method as string} Not Allowed`);
    }
  } catch (e) {
    handle(e, res);
  }
}
