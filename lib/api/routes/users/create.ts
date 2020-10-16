import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { User, UserJSON, isUserJSON } from 'lib/model';
import { handle } from 'lib/api/error';
import createAuthUser from 'lib/api/create/auth-user';
import createCustomToken from 'lib/api/create/custom-token';
import createUserDoc from 'lib/api/create/user-doc';
import createUserNotification from 'lib/api/create/user-notification';
import createUserSearchObj from 'lib/api/create/user-search-obj';
import verifyBody from 'lib/api/verify/body';

export type CreateUserRes = UserJSON;

/**
 * Creates a new user.
 * @todo Add a `code` property to the `APIError` class so that the client can
 * intelligently show i18n messages for specific errors.
 * @todo Don't send the user a custom login token once I fix #116 and get rid of
 * the deprecated org signup page.
 */
export default async function createUser(
  req: Req,
  res: Res<CreateUserRes>
): Promise<void> {
  try {
    const body = verifyBody<User, UserJSON>(req.body, isUserJSON, User);
    const user = await createUserDoc(await createAuthUser(body));
    await createUserSearchObj(user);
    await createUserNotification(user);
    const token = await createCustomToken(user.id);
    res.status(201).json({ ...user.toJSON(), token });
  } catch (e) {
    handle(e, res);
  }
}
