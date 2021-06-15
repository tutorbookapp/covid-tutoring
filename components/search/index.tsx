import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { TextField } from '@rmwc/textfield';
import { nanoid } from 'nanoid';
import useTranslation from 'next-translate/useTranslation';

import Pagination from 'components/pagination';
import Placeholder from 'components/placeholder';

import { User, UserJSON } from 'lib/model/user';
import { Callback } from 'lib/model/callback';
import { UsersQuery } from 'lib/model/query/users';
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
}

export default function Search({
  query,
  results,
  hits,
  searching,
  onChange,
}: SearchProps): JSX.Element {
  const [elevated, setElevated] = useState<boolean>(false);

  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement | null>();

  const loadingResults = useMemo(() => {
    return Array(query.hitsPerPage)
      .fill(null)
      .map(() => <Result loading key={nanoid()} />);
  }, [query.hitsPerPage]);

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
      <div className={styles.filters}>
        <div className={styles.left} />
        <div className={styles.right}>
          <TextField
            outlined
            placeholder={t('search:placeholder')}
            className={styles.searchField}
            value={query.search}
            onChange={(event: FormEvent<HTMLInputElement>) => {
              const search = event.currentTarget.value;
              // TODO: Throttle the actual API requests but immediately show the
              // loading state (i.e. we can't just throttle `setQuery` updates).
              onChange((p) => UsersQuery.parse({ ...p, search, page: 0 }));
            }}
          />
        </div>
      </div>
      <div data-cy='results' className={styles.results}>
        {searching && loadingResults}
        {!searching &&
          results.map((res) => (
            <Result
              key={res.id}
              user={User.fromJSON(res)}
              href={`/${org?.id || 'default'}/users/${res.id}?aspect=${
                query.aspect
              }`}
              newTab
            />
          ))}
        {!searching && !results.length && (
          <div className={styles.empty}>
            <Placeholder>{t('search:empty')}</Placeholder>
          </div>
        )}
      </div>
      <Pagination
        model={UsersQuery}
        setQuery={onChange}
        query={query}
        hits={hits}
      />
    </div>
  );
}
