import { useEffect, useState } from 'react';

import Pagination from 'components/pagination';

import { Org, UsersQuery } from 'lib/model';

import FiltersSheet from './filters-sheet';
import Header from './header';
import ResultsList from './results-list';
import SearchBar from './search-bar';
import styles from './users.module.scss';

interface UsersProps {
  org: Org;
}

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
export default function Users({ org }: UsersProps): JSX.Element {
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<UsersQuery>(
    new UsersQuery({
      orgs: [{ label: org.name, value: org.id }],
      hitsPerPage: 5,
    })
  );
  const [hits, setHits] = useState<number>(query.hitsPerPage);

  useEffect(() => {
    setQuery(
      (prev) =>
        new UsersQuery({
          ...prev,
          orgs: [{ label: org.name, value: org.id }],
        })
    );
  }, [org]);

  return (
    <>
      <Header orgId={org.id} orgName={org.name} />
      <div className={styles.wrapper}>
        <SearchBar query={query} setQuery={setQuery} setOpen={setFiltersOpen} />
        <div className={styles.content}>
          <FiltersSheet open={filtersOpen} query={query} setQuery={setQuery} />
          <ResultsList open={filtersOpen} query={query} setHits={setHits} />
        </div>
        <Pagination query={query} setQuery={setQuery} hits={hits} />
      </div>
    </>
  );
}
