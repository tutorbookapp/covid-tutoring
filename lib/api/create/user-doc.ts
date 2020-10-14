import to from 'await-to-js';

import { APIError } from 'lib/api/error';
import { User } from 'lib/model';
import { db } from 'lib/api/firebase';
import clone from 'lib/utils/clone';

/**
 * Creates the Firestore database document for the given user.
 * @param user - The user to create a document for (must already have an `id`).
 * @return Promise that resolves to the created user; throws an `APIError` if we
 * were unable to create the Firestore document.
 */
export default async function createUserDoc(user: User): Promise<User> {
  const copy = new User(clone(user));
  const doc = await db.collection('users').doc(user.id).get();
  if (doc.exists) {
    const msg = `User (${user.toString()}) already exists in database`;
    throw new APIError(msg, 400);
  }
  const [err] = await to(doc.ref.set(copy.toFirestore()));
  if (err) {
    const msg = `${err.name} saving user (${user.toString()}) in database`;
    throw new APIError(`${msg}: ${err.message}`, 500);
  }
  return copy;
}
