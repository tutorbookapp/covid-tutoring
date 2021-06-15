import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Ripple } from '@rmwc/ripple';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import AvailabilitySelect from 'components/availability-select';
import LangSelect from 'components/lang-select';
import SubjectSelect from 'components/subject-select';

import { Availability } from 'lib/model/availability';
import { Callback } from 'lib/model/callback';
import { Option } from 'lib/model/query/base';
import { UsersQuery } from 'lib/model/query/users';

import styles from './filter-form.module.scss';

interface SearchButtonProps {
  children: string;
  onClick: () => void;
}

function SearchButton({ onClick, children }: SearchButtonProps): JSX.Element {
  return (
    <Ripple>
      <button type='button' onClick={onClick} className={styles.searchButton}>
        {children}
      </button>
    </Ripple>
  );
}

function join(options: Option<string>[]): string {
  return options.map((option: Option<string>) => option.label).join(', ');
}

interface FilterFormProps {
  query: UsersQuery;
  onChange: Callback<UsersQuery>;
}

type FocusTarget = 'subjects' | 'availability' | 'langs';

export default function FilterForm({
  query,
  onChange,
}: FilterFormProps): JSX.Element {
  const [active, setActive] = useState<boolean>(false);
  const [focused, setFocused] = useState<FocusTarget>();

  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!formRef.current) return () => {};
    const element: HTMLElement = formRef.current;
    const removeClickListener = () => {
      /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
      document.removeEventListener('click', outsideClickListener);
    };
    const outsideClickListener = (event: MouseEvent) => {
      if (!element.contains(event.target as Node) && active) {
        setActive(false);
        setFocused(undefined);
        removeClickListener();
      }
    };
    document.addEventListener('click', outsideClickListener);
    return removeClickListener;
  });

  const onSubmit = useCallback((evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setActive(false);
  }, []);
  const onSubjectsChange = useCallback(
    (subjects: Option<string>[]) => {
      onChange((prev) => new UsersQuery({ ...prev, subjects, page: 0 }));
    },
    [onChange]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) => {
      onChange((prev) => new UsersQuery({ ...prev, availability, page: 0 }));
    },
    [onChange]
  );
  const onLangsChange = useCallback(
    (langs: Option<string>[]) => {
      onChange((prev) => new UsersQuery({ ...prev, langs, page: 0 }));
    },
    [onChange]
  );

  const focusSubjects = useCallback(() => {
    setActive(true);
    setFocused('subjects');
  }, []);
  const focusAvailability = useCallback(() => {
    setActive(true);
    setFocused('availability');
  }, []);
  const focusLangs = useCallback(() => {
    setActive(true);
    setFocused('langs');
  }, []);
  const focusNothing = useCallback(() => setFocused(undefined), []);

  const { t } = useTranslation();

  return (
    <>
      <div className={styles.wrapper}>
        <form
          className={cn(styles.form, { [styles.active]: active })}
          onSubmit={onSubmit}
          ref={formRef}
        >
          <SubjectSelect
            className={styles.field}
            focused={focused === 'subjects'}
            label={t('query3rd:subjects')}
            onFocused={focusSubjects}
            onBlurred={focusNothing}
            onSelectedChange={onSubjectsChange}
            selected={query.subjects}
            placeholder={t(`common:${query.aspect}-subjects-placeholder`)}
            aspect={query.aspect}
            outlined
          />
          <AvailabilitySelect
            className={styles.field}
            focused={focused === 'availability'}
            label={t('query3rd:availability')}
            onFocused={focusAvailability}
            onBlurred={focusNothing}
            onChange={onAvailabilityChange}
            value={query.availability}
            outlined
          />
          <LangSelect
            className={styles.field}
            focused={focused === 'langs'}
            label={t('query3rd:langs')}
            placeholder={t('common:langs-placeholder')}
            onFocused={focusLangs}
            onBlurred={focusNothing}
            onSelectedChange={onLangsChange}
            selected={query.langs}
            outlined
          />
        </form>
      </div>
      <div className={styles.search} role='search'>
        <SearchButton onClick={focusSubjects}>
          {join(query.subjects) || t('search:any-subjects')}
        </SearchButton>
        <span className={styles.searchDivider} />
        <SearchButton onClick={focusAvailability}>
          {query.availability.toString() || t('search:any-availability')}
        </SearchButton>
        <span className={styles.searchDivider} />
        <SearchButton onClick={focusLangs}>
          {join(query.langs) || t('search:any-langs')}
        </SearchButton>
      </div>
    </>
  );
}
