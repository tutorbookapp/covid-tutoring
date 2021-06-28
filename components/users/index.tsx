import { useCallback, useEffect, useState } from 'react';
import { dequal } from 'dequal/lite';

import Pagination from 'components/pagination';

import { UsersQuery, endpoint } from 'lib/model/query/users';
import { CallbackParam } from 'lib/model/callback';
import { useOrg } from 'lib/context/org';
import useURLParamSync from 'lib/hooks/url-param-sync';

import FiltersSheet from './filters-sheet';
import Header from './header';
import ResultsList from './results-list';
import SearchBar from './search-bar';
import styles from './users.module.scss';

/**
 * The "Users" view is a fully filterable list of users that can be clicked on
 * to open a user display page that includes:
 * - Profile editing
 * - Convenient contact actions (i.e. email a certain user)
 * This component merely acts as a shared state provider by passing down state
 * variables and their corresponding `setState` callbacks.
 * @todo Ensure that child components are wrapped in `React.memo`s so that they
 * don't re-render due to irrelevant state changes.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/87}
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/75}
 */
export default function Users(): JSX.Element {
  const { org } = useOrg();

  const [searching, setSearching] = useState<boolean>(true);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<UsersQuery>(
    UsersQuery.parse({
      orgs: org ? [org.id] : [],
      aspect: org?.aspects[0] || 'tutoring',
      hitsPerPage: 5,
    })
  );
  const [hits, setHits] = useState<number>(query.hitsPerPage);

  useURLParamSync(query, setQuery, UsersQuery, endpoint, ['orgs']);

  const onQueryChange = useCallback((param: CallbackParam<UsersQuery>) => {
    setQuery((prev) => {
      let updated = prev;
      if (typeof param === 'object') updated = param;
      if (typeof param === 'function') updated = param(updated);
      if (dequal(updated, prev)) return prev;
      setSearching(true);
      return updated;
    });
  }, []);

  useEffect(() => {
    onQueryChange((prev) => {
      if (!org) return prev;
      const aspect = org.aspects.includes(prev.aspect)
        ? prev.aspect
        : org.aspects[0];
      return UsersQuery.parse({ ...prev, orgs: [org.id], aspect });
    });
  }, [org, onQueryChange]);

  return (
    <>
      <Header orgId={org?.id || ''} orgName={org?.name || ''} />
      <div className={styles.wrapper}>
        <SearchBar
          query={query}
          setQuery={onQueryChange}
          setOpen={setFiltersOpen}
        />
        <div className={styles.content}>
          <FiltersSheet
            open={filtersOpen}
            query={query}
            setQuery={onQueryChange}
          />
          <ResultsList
            searching={searching}
            setSearching={setSearching}
            open={filtersOpen}
            query={query}
            setHits={setHits}
          />
        </div>
        <Pagination
          query={query}
          setQuery={onQueryChange}
          hits={hits}
        />
      </div>
    </>
  );
}
