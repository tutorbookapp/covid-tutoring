import { User, UserTag } from 'lib/model';
import clone from 'lib/utils/clone';

export default function updateUserTags(
  user: User,
  actions?: { add?: UserTag[]; remove?: UserTag[] }
): User {
  const tags = new Set<UserTag>([...user.tags, ...user.roles]);

  if (user.mentoring.subjects.length) tags.add('mentor');
  if (user.mentoring.searches.length) tags.add('mentee');
  if (user.tutoring.subjects.length) tags.add('tutor');
  if (user.tutoring.searches.length) tags.add('tutee');

  if (user.verifications.length) tags.add('vetted');
  if (!user.verifications.length) tags.delete('vetted');

  actions?.add?.forEach((tag) => tags.add(tag));
  actions?.remove?.forEach((tag) => tags.delete(tag));

  return new User(clone({ ...user, tags: [...tags] }));
}
