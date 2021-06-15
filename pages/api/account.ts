import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import { dequal } from 'dequal/lite';
import { serialize } from 'cookie';
import to from 'await-to-js';

import { APIError, handle } from 'lib/api/error';
import { DecodedIdToken, auth } from 'lib/api/firebase';
import {
  Subjects,
  User,
  UserInterface,
  UserJSON,
  isUserJSON,
} from 'lib/model';
import { Availability } from 'lib/model';
import { SocialInterface } from 'lib/model';
import { Timeslot } from 'lib/model';
import { Verification } from 'lib/model';
import clone from 'lib/utils/clone';
import getUser from 'lib/api/get/user';
import segment from 'lib/api/segment';
import updateAuthUser from 'lib/api/update/auth-user';
import updatePhoto from 'lib/api/update/photo';
import updateUserDoc from 'lib/api/update/user-doc';
import updateUserOrgs from 'lib/api/update/user-orgs';
import updateUserSearchObj from 'lib/api/update/user-search-obj';
import updateUserTags from 'lib/api/update/user-tags';
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

interface ModelInterface<T> {
  new (model: T): T;
}

function mergeArrays<T>(
  overrides: T[],
  baseline: T[],
  Model?: ModelInterface<T>
): T[] {
  const merged = clone(overrides).map((m) => (Model ? new Model(m) : m));
  baseline.forEach((i) => {
    if (!merged.some((im) => dequal(im, i)))
      merged.push(Model ? new Model(clone(i)) : clone(i));
  });
  return merged;
}

// TODO: Implement a more sophisticated merging of e.g. overlapping timeslots.
function mergeAvailability(
  overrides: Availability,
  baseline: Availability
): Availability {
  return Availability.parse(...mergeArrays(overrides, baseline, Timeslot));
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
  const merged: UserInterface = {
    id: overrides.id || baseline.id,
    name: overrides.name || baseline.name,

    // Don't override an existing profile picture when the user is logging in
    // with Google. Typically, the existing picture will be better (e.g. higher
    // quality and an actual face instead of a letter) than the Google avatar.
    photo: baseline.photo || overrides.photo,

    background: overrides.background || baseline.background,
    email: overrides.email || baseline.email,
    phone: overrides.phone || baseline.phone,
    bio: overrides.bio || baseline.bio,
    venue: overrides.venue || baseline.venue,
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
    verifications: mergeArrays(
      overrides.verifications,
      baseline.verifications,
      Verification
    ),
    visible: overrides.visible || baseline.visible,
    featured: mergeArrays(overrides.featured, baseline.featured),
    roles: mergeArrays(overrides.roles, baseline.roles),
    tags: mergeArrays(overrides.tags, baseline.tags),
    reference: overrides.reference || baseline.reference,
    timezone: overrides.timezone || baseline.timezone,

    // Don't override the existing creation timestamp. These will be updated by
    // Firestore data conversion methods anyways, so it doesn't really matter.
    created: baseline.created || overrides.created,
    updated: overrides.updated || baseline.updated,
  };
  return User.parse(merged);
}

async function updateAccount(req: Req, res: Res): Promise<void> {
  const body = verifyBody<User, UserJSON>(req.body, isUserJSON, User);

  // Revert to old behavior if user doesn't already exist; just create it.
  const original = (await to(getUser(body.id)))[1];

  // Merge the two users giving priority to the request body (but preventing any
  // loss of data; `mergeUsers` won't allow falsy values or empty arrays).
  const merged = mergeUsers(body, original || User.parse({}));

  // Either:
  // 1. Verify the user's authentication cookie (that this API endpoint sets).
  // 2. Verify the user's ID token (sent when the user first logs in).
  const [err] = await to(verifyAuth(req.headers, { userId: merged.id }));
  if (err) {
    // TODO: Guard against CSRF attacks (using a CSRF cookie token).
    const jwt = body.token;
    if (!jwt) throw new APIError('Could not find an auth cookie or JWT', 401);
    
    // Only process if the user just signed in in the last 5 minutes.
    const [err, token] = await to<DecodedIdToken>(auth.verifyIdToken(jwt, true));
    if (err) throw new APIError(`Your JWT is invalid: ${err.message}`, 401);
    if (!token) throw new APIError('Could not decode your ID token', 401);
    if (new Date().getTime() / 1000 - token.auth_time > 5 * 60) 
      throw new APIError('A more recent login is required. Try again', 401);
   
    // Create and set a new session cookie that expires after 5 days.
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const [e, cookie] = await to(auth.createSessionCookie(jwt, { expiresIn }));
    if (e) throw new APIError('Could not create session cookie', 401);
    res.setHeader(
      'Set-Cookie',
      serialize('session', cookie as string, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: true,
      })
    );
  }
  
  const withOrgsUpdate = updateUserOrgs(merged);
  const withTagsUpdate = updateUserTags(withOrgsUpdate);
  const withPhotoUpdate = await updatePhoto(withTagsUpdate, User);
  const withAuthUpdate = await updateAuthUser(withPhotoUpdate);

  await Promise.all([
    updateUserDoc(withAuthUpdate),
    updateUserSearchObj(withAuthUpdate),
  ]);

  res.status(200).json(withAuthUpdate.toJSON());
  segment.track({
    userId: withAuthUpdate.id,
    event: 'Account Updated',
    properties: withAuthUpdate.toSegment(),
  });
}

async function getAccount(req: Req, res: Res): Promise<void> {
  const { uid } = await verifyAuth(req.headers);
  res.statusCode = 302;
  res.setHeader('Location', `/api/users/${uid}`);
  res.end();
  segment.track({ userId: uid, event: 'Account Fetched' });
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
