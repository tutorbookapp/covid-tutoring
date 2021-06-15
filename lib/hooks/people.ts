import { useMemo } from 'react';
import useSWR from 'swr';

import { User, UserJSON } from 'lib/model';
import { Match } from 'lib/model';

export default function usePeople(match: Match): User[] {
  const { data } = useSWR<UserJSON[]>(
    match.id ? `/api/matches/${match.id}/people` : null
  );
  const people = useMemo(() => {
    if (data) return data.map((u) => User.fromJSON(u));
    return match.people.map((p) => {
      const user = new User(p);
      if (p.roles.includes('tutor')) {
        user.tutoring.subjects = match.subjects;
      } else if (p.roles.includes('mentor')) {
        user.mentoring.subjects = match.subjects;
      }
      return user;
    });
  }, [data, match.subjects, match.people]);

  return people;
}
