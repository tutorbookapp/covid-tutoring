import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import useTranslation from 'next-translate/useTranslation';

import Carousel from 'components/carousel';
import Pagination from 'components/pagination';

import { Callback, User, UserJSON, UsersQuery } from 'lib/model';
import { useOrg } from 'lib/context/org';

import Form from './form';
import Result from './result';
import styles from './search.module.scss';

interface SearchProps {
  onChange: Callback<UsersQuery>;
  results: UserJSON[];
  hits: number;
  searching: boolean;
  query: UsersQuery;
  setViewing: Callback<UserJSON | undefined>;
}

export default function Search({
  query,
  results,
  hits,
  searching,
  onChange,
  setViewing,
}: SearchProps): JSX.Element {
  const [elevated, setElevated] = useState<boolean>(false);

  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement | null>();
  const noResultsQuery = useMemo(() => {
    return new UsersQuery({
      orgs: query.orgs,
      aspect: query.aspect,
      visible: true,
    });
  }, [query.aspect, query.orgs]);

  const loadingResults = useMemo(() => {
    return Array(query.hitsPerPage)
      .fill(null)
      .map(() => <Result loading key={nanoid()} />);
  }, [query.hitsPerPage]);

  const onNoResultsClick = useCallback((u: User) => setViewing(u.toJSON()), [
    setViewing,
  ]);

  useEffect(() => {
    const listener = () => {
      if (!formRef.current) return;
      const viewportOffset = formRef.current.getBoundingClientRect();
      const updated: boolean = viewportOffset.top <= 74;
      // We have to wait a tick before changing the class for the animation to
      // work. @see {@link https://stackoverflow.com/a/37643388/10023158}
      if (updated !== elevated) setTimeout(() => setElevated(updated), 100);
    };
    window.addEventListener('scroll', listener);
    return () => window.removeEventListener('scroll', listener);
  });

  const { org } = useOrg();

  return (
    <div className={styles.wrapper}>
      <Form query={query} onChange={onChange} />
      {(searching || !!results.length) && (
        <>
          <ul data-cy='results' className={styles.results}>
            {searching && loadingResults}
            {!searching &&
              results.map((res) => (
                <Result
                  key={res.id}
                  user={User.fromJSON(res)}
                  href={`/${org?.id || 'default'}/users/${res.id}?aspect=${
                    query.aspect
                  }`}
                />
              ))}
          </ul>
          <Pagination query={query} setQuery={onChange} hits={hits} />
        </>
      )}
      {!searching && !results.length && (
        <div data-cy='no-results' className={styles.noResults}>
          <h3 className={styles.noResultsHeader}>
            {t('search:no-results-title')}
          </h3>
          <p className={styles.noResultsBody}>{t('search:no-results-body')}</p>
          <Carousel query={noResultsQuery} onClick={onNoResultsClick} />
        </div>
      )}
    </div>
  );
}
