import to from 'await-to-js';

import { FirebaseError, UserRecord, auth } from 'lib/api/firebase';
import { APIError } from 'lib/api/error';
import { User } from 'lib/model/user';
import clone from 'lib/utils/clone';

/**
 * Updates the Firebase Authentication account for the given user.
 * @param user - The user to update the account for.
 * @return Promise that resolves to the updated user; throws an `APIError` if we
 * were unable to update the Firebase Authentication account.
 * @todo Perhaps remove the `validatePhone` method as it isn't used anywhere
 * else besides here.
 * @todo Handle common Firebase Authentication errors such as
 * `auth/phone-number-already-exists` or `auth/email-already-exists`.
 * @todo Remove code duplication from the `createAuthUser` component fx.
 * @todo Previously (before this massive API refactor), we prevented the user
 * from removing essential data (e.g. email) from their account. Do we want to
 * add this functionality again?
 */
export default async function updateAuthUser(user: User): Promise<User> {
  await user.validatePhone();
  const [err, userRecord] = await to<UserRecord, FirebaseError>(
    auth.updateUser(user.id, {
      disabled: false,
      email: user.email,
      emailVerified: false,
      displayName: user.name,
      photoURL: user.photo || undefined,
      phoneNumber: user.phone || undefined,
    })
  );
  if (err) {
    // TODO: Find a better way to setup my testing environment such that I don't
    // have to add these error handling exceptions. Ideally, I should be able to
    // manipulate the state of my authentication backend during tests.
    if (
      ['development', 'test'].includes(process.env.APP_ENV as string) &&
      [
        'auth/email-already-exists',
        'auth/phone-number-already-exists',
      ].includes(err.code)
    )
      return User.parse(clone(user));
    const msg = `${err.name} (${err.code}) updating auth account`;
    throw new APIError(`${msg} for ${user.toString()}: ${err.message}`, 500);
  }
  const record = userRecord as UserRecord;
  const updatedUser = User.parse(
    clone({
      ...user,
      email: record.email,
      phone: record.phoneNumber,
      photo: record.photoURL,
      name: record.displayName,
      id: record.uid,
    })
  );
  return updatedUser;
}
