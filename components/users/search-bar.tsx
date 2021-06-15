import { Chip, ChipSet } from '@rmwc/chip';
import { FormEvent, memo } from 'react';
import { IconButton } from '@rmwc/icon-button';
import { TextField } from '@rmwc/textfield';
import useTranslation from 'next-translate/useTranslation';

import FilterListIcon from 'components/icons/filter-list';
import DownloadIcon from 'components/icons/download';

import { Callback } from 'lib/model';
import { UsersQuery } from 'lib/model';
import { useOrg } from 'lib/context/org';

import styles from './search-bar.module.scss';

export interface SearchBarProps {
  query: UsersQuery;
  setQuery: Callback<UsersQuery>;
  setOpen: Callback<boolean>;
}

// TODO: Don't include both the "User types" filters in the FilterSheet and the
// aspect chips in this SearchBar. Instead, refactor the UsersQuery data model
// to have `tutoring.subjects` and `mentoring.subjects` at the same time.
function SearchBar({ query, setQuery, setOpen }: SearchBarProps): JSX.Element {
  const { t } = useTranslation();
  const { org } = useOrg();

  return (
    <div className={styles.filters}>
      <div className={styles.left}>
        <IconButton
          data-cy='filters-button'
          className={styles.filtersButton}
          onClick={() => setOpen((prev) => !prev)}
          icon={<FilterListIcon />}
        />
        <IconButton
          data-cy='download-button'
          onClick={() => window.open(query.getURL('/api/users/csv'))}
          icon={<DownloadIcon />}
        />
        <ChipSet className={styles.filterChips}>
          <Chip
            label={t('users:filters-visible')}
            checkmark
            onInteraction={() => {
              setQuery((prev) => {
                const { visible: vprev } = prev;
                const visible = vprev !== true ? true : undefined;
                return new UsersQuery({ ...prev, visible, page: 0 });
              });
            }}
            selected={query.visible === true}
          />
          <Chip
            label={t('users:filters-hidden')}
            checkmark
            onInteraction={() => {
              setQuery((prev) => {
                const { visible: vprev } = prev;
                const visible = vprev !== false ? false : undefined;
                return new UsersQuery({ ...prev, visible, page: 0 });
              });
            }}
            selected={query.visible === false}
          />
          {org?.aspects.length === 2 && (
            <Chip
              label={t('common:mentoring')}
              checkmark
              onInteraction={() => {
                const aspect = 'mentoring';
                setQuery((p) => new UsersQuery({ ...p, aspect, page: 0 }));
              }}
              selected={query.aspect === 'mentoring'}
            />
          )}
          {org?.aspects.length === 2 && (
            <Chip
              label={t('common:tutoring')}
              checkmark
              onInteraction={() => {
                const aspect = 'tutoring';
                setQuery((p) => new UsersQuery({ ...p, aspect, page: 0 }));
              }}
              selected={query.aspect === 'tutoring'}
            />
          )}
        </ChipSet>
      </div>
      <div className={styles.right}>
        <TextField
          outlined
          placeholder={t('users:search-placeholder')}
          className={styles.searchField}
          value={query.search}
          onChange={(event: FormEvent<HTMLInputElement>) => {
            const search = event.currentTarget.value;
            // TODO: Throttle the actual API requests but immediately show the
            // loading state (i.e. we can't just throttle `setQuery` updates).
            setQuery((p) => new UsersQuery({ ...p, search, page: 0 }));
          }}
        />
      </div>
    </div>
  );
}

export default memo(SearchBar);
