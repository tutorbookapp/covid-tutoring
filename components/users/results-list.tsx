import { animated, useSpring } from 'react-spring';
import { memo, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import useTranslation from 'next-translate/useTranslation';
import { v4 as uuid } from 'uuid';

import Placeholder from 'components/placeholder';
import Result from 'components/search/result';

import { User, UserJSON } from 'lib/model/user';
import { UsersQuery, endpoint } from 'lib/model/query/users';
import { Callback } from 'lib/model/callback';
import { ListUsersRes } from 'lib/api/routes/users/list';
import clone from 'lib/utils/clone';
import { prefetch } from 'lib/fetch';
import { useOrg } from 'lib/context/org';

import { config, width } from './spring-animation';
import styles from './results-list.module.scss';

export interface ResultsListProps {
  query: UsersQuery;
  searching: boolean;
  setSearching: Callback<boolean>;
  setHits: Callback<number>;
  open: boolean;
}

export default memo(function ResultsList({
  query,
  searching,
  setSearching,
  setHits,
  open,
}: ResultsListProps): JSX.Element {
  const { org } = useOrg();
  const { t } = useTranslation();
  const { data, isValidating } = useSWR<ListUsersRes>(endpoint(query));

  // Prefetch the next page of results (using SWR's global cache).
  // @see {@link https://swr.vercel.app/docs/prefetching}
  useEffect(() => {
    const nextPageQuery = UsersQuery.parse(
      clone({ ...query, page: query.page + 1 })
    );
    void prefetch(endpoint(nextPageQuery));
  }, [query]);

  // TODO: Avoid code duplication from the main search page by porting over all
  // of this logic into custom hooks or a shared lib directory.
  useEffect(() => setHits((prev) => data?.hits || prev), [setHits, data?.hits]);
  useEffect(() => {
    setSearching((prev) => prev && (isValidating || !data));
  }, [isValidating, data]);

  const loadingRows: JSX.Element[] = useMemo(() => {
    // TODO: When we know there are only 3 results (i.e. results 111-113 of 113)
    // only show 3 loading rows. We'll have to include some pagination parsing
    // logic here (using `prevHits` and `query.page`).
    return Array(query.hitsPerPage)
      .fill(null)
      .map(() => <Result className={styles.item} loading key={uuid()} />);
  }, [query.hitsPerPage]);
  const props = useSpring({ config, marginLeft: open ? width : 0 });

  return (
    <animated.div data-cy='results' className={styles.wrapper} style={props}>
      {!searching &&
        (data?.users || []).map((user: UserJSON) => (
          <Result
            href={`/${org?.id || ''}/users/${user.id}`}
            user={User.parse(user)}
            className={styles.item}
            key={user.id}
            newTab
          />
        ))}
      {!searching && !(data?.users || []).length && (
        <div className={styles.empty}>
          <Placeholder>{t('users:empty')}</Placeholder>
        </div>
      )}
      {searching && loadingRows}
    </animated.div>
  );
});
