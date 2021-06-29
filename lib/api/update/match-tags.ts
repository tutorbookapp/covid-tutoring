import { Match, MatchTag } from 'lib/model/match';
import clone from 'lib/utils/clone';

// TODO: Make this operation async and actually check if this match has any
// upcoming meetings scheduled. Right now, match tags mean nothing.
export default function updateMatchTags(match: Match): Match {
  const tags: MatchTag[] = [];
  if (false) tags.push('meeting');
  return Match.parse(clone({ ...match, tags }));
}
