import { animated, useSpring } from 'react-spring';
import { memo, useCallback } from 'react';
import { dequal } from 'dequal/lite';

import SubjectSelect from 'components/subject-select';
import TagSelect from 'components/tag-select';
import UserSelect from 'components/user-select';

import { MEETING_TAGS, MeetingHitTag } from 'lib/model/meeting';
import { Callback } from 'lib/model/callback';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { Option } from 'lib/model/query/base';

import { config, width } from './spring-animation';
import styles from './filters-sheet.module.scss';

export interface FiltersSheetProps {
  query: MeetingsQuery;
  setQuery: Callback<MeetingsQuery>;
  filtersOpen: boolean;
}

function FiltersSheet({
  query,
  setQuery,
  filtersOpen,
}: FiltersSheetProps): JSX.Element {
  const props = useSpring({ config, width: filtersOpen ? width : 0 });

  const onSubjectsChange = useCallback(
    (subjects: Option[]) => {
      setQuery((prev) => new MeetingsQuery({ ...prev, subjects, page: 0 }));
    },
    [setQuery]
  );
  const onPeopleChange = useCallback(
    (people: Option[]) => {
      setQuery((prev) => new MeetingsQuery({ ...prev, people, page: 0 }));
    },
    [setQuery]
  );
  const onTagsChange = useCallback(
    (tags: MeetingHitTag[]) => {
      setQuery((prev) => new MeetingsQuery({ ...prev, tags, page: 0 }));
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
          label='Subjects'
          onSelectedChange={onSubjectsChange}
          selected={query.subjects}
          className={styles.field}
          renderToPortal
          outlined
        />
        <UserSelect
          label='People'
          onSelectedChange={onPeopleChange}
          selected={query.people}
          className={styles.field}
          renderToPortal
          outlined
        />
        <TagSelect
          label='Tags'
          placeholder='Ex: Recurring'
          onChange={onTagsChange}
          value={query.tags}
          className={styles.field}
          options={MEETING_TAGS}
          renderToPortal
          outlined
        />
      </form>
    </animated.div>
  );
}

export default memo(FiltersSheet, dequal);
