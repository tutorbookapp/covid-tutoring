import { User } from 'lib/model/user';
import clone from 'lib/utils/clone';

export default function updateUserOrgs(user: User): User {
  const updated = User.parse(clone(user));
  if (!updated.orgs.length) updated.orgs.push('default');
  return updated;
}
