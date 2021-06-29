import useSWR, { mutate } from 'swr';
import { nanoid } from 'nanoid';
import { useEffect } from 'react';

import { User, UserJSON } from 'lib/model/user';
import { UsersQuery, endpoint } from 'lib/model/query/users';
import { ListUsersRes } from 'lib/api/routes/users/list';
import { useOrg } from 'lib/context/org';

import { LoadingCard, UserCard } from './cards';
import Carousel from './carousel';

interface Props {
  query: UsersQuery;
  onClick?: (user: User) => void;
}

export default function UserCarousel({ query, onClick }: Props): JSX.Element {
  const { data } = useSWR<ListUsersRes>(endpoint(query));
  const { org } = useOrg();

  useEffect(() => {
    void mutate(endpoint(query));
  }, [query]);

  return (
    <>
      {data && (
        <Carousel>
          {data.users
            .map((u: UserJSON) => User.parse(u))
            .map((user: User) => (
              <UserCard
                key={user.id}
                user={user}
                onClick={onClick ? () => onClick(user) : undefined}
                href={
                  !onClick
                    ? `/${org?.id || 'default'}/users/${user.id}`
                    : undefined
                }
              />
            ))}
        </Carousel>
      )}
      {!data && (
        <Carousel>
          {Array(6)
            .fill(null)
            .map(() => (
              <LoadingCard key={nanoid()} />
            ))}
        </Carousel>
      )}
    </>
  );
}
