import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import to from 'await-to-js';

import {
  Person,
  Request,
  RequestJSON,
  Role,
  Timeslot,
  User,
  UserWithRoles,
} from 'lib/model';

import error from './helpers/error';
import {
  DecodedIdToken,
  DocumentReference,
  DocumentSnapshot,
  auth,
  db,
} from './helpers/firebase';

export type CreateRequestRes = RequestJSON;

/**
 * Takes an `RequestJSON` object, an authentication token, and:
 * 1. Performs the following verifications (sends a `400` error code and an
 *    accompanying human-readable error message if any of them fail):
 *    - Verifies the correct request body was sent (e.g. all parameters are there
 *      and are all of the correct types).
 *    - Verifies that the requested `Timeslot` is within all of the `person`'s
 *      availability (by reading each `person`'s Firestore profile document).
 *      Note that we **do not** throw an error if it is the request sender who
 *      is unavailable.
 *    - Verifies that the requested `subjects` are included in each of the
 *      tutors' Firestore profile documents (where a tutor is defined as an
 *      `person` whose `roles` include `tutor`).
 *    - Verifies that the given authentication JWT belongs to either an admin of
 *      orgs that all the tutees and mentees are a part of or the parent of all
 *      the tutees and mentees. In the future, teachers will also be able to
 *      create requests on behalf of their students and students will be able to
 *      add fellow students (i.e. students within the same org) to their requests.
 * 2. Adds all the tutee and mentee parents as people.
 * 3. Creates a new `requests` document.
 *
 * @param {RequestJSON} request - The request to create a pending request for.
 * The given `idToken` **must** be from one of the request's `people`
 * (see the above description for more requirements).
 * @return {RequestJSON} The created request (typically this is exactly the same as
 * the given `request` but it can be different if the server implements
 * different validations than the client).
 */
export default async function createRequest(
  req: NextApiRequest,
  res: NextApiResponse<CreateRequestRes>
): Promise<void> {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  // 1. Verify that the request body is valid.
  console.log('[DEBUG] Verifying request body and authentication JWT...');
  if (!req.body) {
    error(res, 'You must provide a request body.');
  } else if (!req.body.subjects || !req.body.subjects.length) {
    error(res, 'Your request must contain valid subjects.');
  } else if (!req.body.people || req.body.people.length < 1) {
    error(res, 'Your request must have >= 1 people.');
  } else if (req.body.time && typeof req.body.time !== 'object') {
    error(res, 'Your request had an invalid time.');
  } else if (
    req.body.time &&
    new Date(req.body.time.from).toString() === 'Invalid Date'
  ) {
    error(res, 'Your request had an invalid start time.');
  } else if (
    req.body.time &&
    new Date(req.body.time.to).toString() === 'Invalid Date'
  ) {
    error(res, 'Your request had an invalid end time.');
  } else if (!req.headers.authorization) {
    error(res, 'You must provide a valid Firebase Auth JWT.', 401);
  } else {
    const [err, token] = await to<DecodedIdToken>(
      auth.verifyIdToken(req.headers.authorization.replace('Bearer ', ''), true)
    );
    if (err) {
      error(res, `Your Firebase Auth JWT is invalid: ${err.message}`, 401, err);
    } else {
      const request: Request = Request.fromJSON(req.body);
      const people: UserWithRoles[] = [];
      const parents: User[] = [];
      let errored = false;
      let creator = new User({
        id: (token as DecodedIdToken).uid,
        email: (token as DecodedIdToken).email,
        photo: (token as DecodedIdToken).picture,
        phone: (token as DecodedIdToken).phone_number,
      });
      if (creator.id !== request.creator.id) {
        const msg =
          `Authentication JWT (${creator.id}) did not belong to the listed ` +
          `request creator (${request.creator.id}).`;
        error(res, msg, 401);
      } else {
        await Promise.all(
          request.people.map(async (person: Person) => {
            if (errored) return;
            // 1. Verify that the people have uIDs.
            if (!person.id) {
              error(res, 'All people must have valid uIDs.');
              errored = true;
              return;
            }
            const personRef: DocumentReference = db
              .collection('users')
              .doc(person.id);
            const personDoc: DocumentSnapshot = await personRef.get();
            // 1. Verify that the people exist.
            if (!personDoc.exists) {
              error(res, `Person (${person.id}) does not exist.`);
              errored = true;
              return;
            }
            const user: User = User.fromFirestore(personDoc);
            // 1. Verify that the request creator is an person.
            if (user.id === creator.id) creator = new User({ ...user });
            // 1. Verify that the people are available (note that we don't throw
            // an error if it is the request sender who is unavailable).
            let timeslot = 'during request time';
            if (
              request.times &&
              !request.times.every((time: Timeslot) => {
                timeslot = time.toString();
                return user.availability.contains(time);
              })
            ) {
              if (person.id === creator.id) {
                console.warn(`[WARNING] Creator unavailable ${timeslot}.`);
              } else {
                error(res, `${user.toString()} unavailable ${timeslot}.`);
                errored = true;
                return;
              }
            }
            // 1. Verify the tutors can teach the requested subjects.
            const isTutor: boolean = person.roles.indexOf('tutor') >= 0;
            const isMentor: boolean = person.roles.indexOf('mentor') >= 0;
            const canTutorSubject: (s: string) => boolean = (s: string) => {
              return user.tutoring.subjects.includes(s);
            };
            const canMentorSubject: (s: string) => boolean = (s: string) => {
              return user.mentoring.subjects.includes(s);
            };
            if (isTutor && !request.subjects.every(canTutorSubject)) {
              error(res, `${user.toString()} cannot tutor these subjects.`);
              errored = true;
              return;
            }
            if (isMentor && !request.subjects.every(canMentorSubject)) {
              error(res, `${user.toString()} cannot mentor these subjects.`);
              errored = true;
              return;
            }
            (user as UserWithRoles).roles = person.roles;
            people.push(user as UserWithRoles);
            // 2. Add all mentee and tutee parents as people.
            if (!isTutor && !isMentor)
              await Promise.all(
                user.parents.map(async (id) => {
                  const doc = await db.collection('users').doc(id).get();
                  const warningMsg = `[WARNING] Parent (${id}) doesn't exist.`;
                  if (!doc.exists) console.warn(warningMsg);
                  parents.push(User.fromFirestore(doc));
                })
              );
          })
        );
        parents.forEach((parent: User) => {
          const roles: Role[] = ['parent'];
          request.people.push({ roles, id: parent.id, handle: uuid() });
          const parentWithRoles = parent as UserWithRoles;
          parentWithRoles.roles = roles;
          people.push(parentWithRoles);
        });
        if (!errored) {
          if (!creator.name) {
            const doc = await db.collection('users').doc(creator.id).get();
            const msg = `Creator (${creator.id}) does not exist.`;
            if (!doc.exists) return error(res, msg);
            creator = User.fromFirestore(doc);
          }
          const orgIds: string[] = (
            await db
              .collection('orgs')
              .where('members', 'array-contains', creator.id)
              .get()
          ).docs.map((org: DocumentSnapshot) => org.id);
          // 1. Verify that all the tutees and mentees are either:
          // - The creator of the request (i.e. the owner of the JWT).
          // - The children of the creator (i.e. the creator is their parent).
          // - Part of an org that the creator is an admin of.
          const errorMsg =
            `Creator (${creator.toString()}) is not authorized to create ` +
            `requests for these people.`;
          if (
            !people.every((a: UserWithRoles) => {
              if (a.roles.every((r) => ['tutee', 'mentee'].indexOf(r) < 0))
                return true;
              if (a.id === creator.id) return true;
              if (a.parents.indexOf(creator.id) >= 0) return true;
              if (a.orgs.some((id) => orgIds.indexOf(id) >= 0)) return true;
              return false;
            })
          )
            return error(res, errorMsg, 401);
          request.id = db.collection('requests').doc().id;
          console.log(`[DEBUG] Creating request (${request.id})...`);
          await db
            .collection('requests')
            .doc(request.id)
            .set(request.toFirestore());
          res.status(201).json(request.toJSON());
          console.log('[DEBUG] Created request and sent success response.');
        }
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
