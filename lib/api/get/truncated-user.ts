import { User } from 'lib/model';

/**
 * For privacy reasons, we only add the user's first name and last initial to
 * our Algolia search index (and thus we **never** share the user's full name).
 * @example
 * assert(onlyFirstNameAndLastInitial('Nicholas Chiang') === 'Nicholas C.');
 */
export function onlyFirstNameAndLastInitial(name: string): string {
  const split: string[] = name.trim().split(' ');
  if (split.length === 1) return split[0];
  return `${split[0]} ${split[split.length - 1][0]}.`;
}

/**
 * Returns truncated user data for search results.
 * @param users - The array of complete user data to truncate.
 * @return An array of user objects that only contain some of the information
 * included in `users`.
 */
export default function getTruncatedUser(user: User): User {
  return new User({
    name: onlyFirstNameAndLastInitial(user.name),
    photo: user.photo,
    bio: user.bio,
    orgs: user.orgs,
    availability: user.availability,
    mentoring: user.mentoring,
    tutoring: user.tutoring,
    socials: user.socials,
    langs: user.langs,
    id: user.id,
  });
}
