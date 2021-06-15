import { animated, useSpring } from 'react-spring';
import { memo, useCallback } from 'react';
import useTranslation from 'next-translate/useTranslation';

import AvailabilitySelect from 'components/availability-select';
import LangSelect from 'components/lang-select';
import SubjectSelect from 'components/subject-select';
import TagSelect from 'components/tag-select';

import { USER_TAGS, UserHitTag } from 'lib/model';
import { Availability } from 'lib/model';
import { Callback } from 'lib/model';
import { Option } from 'lib/model';
import { UsersQuery } from 'lib/model';

import { config, width } from './spring-animation';
import styles from './filters-sheet.module.scss';

export interface FiltersSheetProps {
  query: UsersQuery;
  setQuery: Callback<UsersQuery>;
  open: boolean;
}

function FiltersSheet({
  query,
  setQuery,
  open,
}: FiltersSheetProps): JSX.Element {
  const { t } = useTranslation();

  const props = useSpring({ config, width: open ? width : 0 });

  const onSubjectsChange = useCallback(
    (subjects: Option<string>[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, subjects, page: 0 }));
    },
    [setQuery]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) => {
      setQuery((prev) => new UsersQuery({ ...prev, availability, page: 0 }));
    },
    [setQuery]
  );
  const onLangsChange = useCallback(
    (langs: Option<string>[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, langs, page: 0 }));
    },
    [setQuery]
  );
  const onTagsChange = useCallback(
    (tags: UserHitTag[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, tags, page: 0 }));
    },
    [setQuery]
  );

  return (
    <animated.div
      data-cy='filters-sheet'
      className={styles.wrapper}
      style={props}
    >
      <form className={styles.form} style={{ width }}>
        <SubjectSelect
          label={t('query:subjects')}
          onSelectedChange={onSubjectsChange}
          selected={query.subjects}
          placeholder={t(`common:${query.aspect}-subjects-placeholder`)}
          aspect={query.aspect}
          className={styles.field}
          renderToPortal
          outlined
        />
        <AvailabilitySelect
          label={t('query:availability')}
          onChange={onAvailabilityChange}
          value={query.availability}
          className={styles.field}
          renderToPortal
          outlined
        />
        <LangSelect
          label={t('query:langs')}
          placeholder={t('common:langs-placeholder')}
          onSelectedChange={onLangsChange}
          selected={query.langs}
          className={styles.field}
          renderToPortal
          outlined
        />
        <TagSelect
          label={t('query:tags')}
          placeholder={t('query:tags-placeholder')}
          onChange={onTagsChange}
          value={query.tags}
          className={styles.field}
          options={USER_TAGS}
          renderToPortal
          outlined
        />
      </form>
    </animated.div>
  );
}

export default memo(FiltersSheet);
