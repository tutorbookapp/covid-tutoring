import { FormEvent, useCallback, useEffect, useState } from 'react';
import Router from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import Button from 'components/button';
import SubjectSelect from 'components/subject-select';

import { UsersQuery, endpoint } from 'lib/model/query/users';
import { Option } from 'lib/model/query/base';
import { useUser } from 'lib/context/user';

import styles from './search-form.module.scss';

export default function SearchForm(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [query, setQuery] = useState<UsersQuery>(
    UsersQuery.parse({ langs: [], subjects: [] })
  );

  useEffect(() => {
    const pathname = `/${user.orgs[0] || 'default'}/search`;
    void Router.prefetch(endpoint(query, pathname));
  }, [query, user.orgs]);

  const onSubjectsChange = useCallback((subjects: Option[]) => {
    setQuery((prev: UsersQuery) => UsersQuery.parse({ ...prev, subjects }));
  }, []);

  const searchMentors = useCallback(
    (evt: FormEvent<HTMLButtonElement>) => {
      evt.preventDefault();
      evt.stopPropagation();
      setSubmitting(true);
      const qry = UsersQuery.parse({ ...query, aspect: 'mentoring' });
      return Router.push(endpoint(qry, `/${user.orgs[0] || 'default'}/search`));
    },
    [query, user.orgs]
  );
  const searchTutors = useCallback(
    (evt: FormEvent<HTMLButtonElement>) => {
      evt.preventDefault();
      evt.stopPropagation();
      setSubmitting(true);
      const qry = UsersQuery.parse({ ...query, aspect: 'tutoring' });
      return Router.push(endpoint(qry, `/${user.orgs[0] || 'default'}/search`));
    },
    [query, user.orgs]
  );

  return (
    <div data-cy='search-form' className={styles.form}>
      <SubjectSelect
        label={t('query3rd:subjects')}
        onSelectedChange={onSubjectsChange}
        selected={query.subjects}
        placeholder={t('common:subjects-placeholder')}
        className={styles.field}
        outlined
      />
      <Button
        onClick={searchMentors}
        className={styles.btn}
        label={t('query3rd:mentoring-btn')}
        disabled={submitting}
        raised
        arrow
      />
      <Button
        onClick={searchTutors}
        className={styles.btn}
        label={t('query3rd:tutoring-btn')}
        disabled={submitting}
        raised
        arrow
      />
    </div>
  );
}
