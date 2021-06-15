import { memo, useCallback } from 'react';
import { IconButton } from '@rmwc/icon-button';
import { TextField } from '@rmwc/textfield';
import { dequal } from 'dequal/lite';

import DownloadIcon from 'components/icons/download';
import FilterListIcon from 'components/icons/filter-list';

import { Callback } from 'lib/model';
import { MeetingsQuery } from 'lib/model';

import styles from './search-bar.module.scss';

export interface SearchBarProps {
  query: MeetingsQuery;
  setQuery: Callback<MeetingsQuery>;
  setFiltersOpen: Callback<boolean>;
  byOrg?: boolean;
}

function SearchBar({
  query,
  setQuery,
  setFiltersOpen,
  byOrg,
}: SearchBarProps): JSX.Element {
  const downloadResults = useCallback(() => {
    window.open(query.getURL('/api/meetings/csv'));
  }, [query]);

  return (
    <div className={styles.filters}>
      <div className={styles.left}>
        {byOrg && (
          <IconButton
            data-cy='filters-button'
            className={styles.filtersButton}
            onClick={() => setFiltersOpen((prev) => !prev)}
            icon={<FilterListIcon />}
          />
        )}
        {byOrg && (
          <IconButton
            data-cy='download-button'
            onClick={downloadResults}
            icon={<DownloadIcon />}
          />
        )}
      </div>
      <div className={styles.right}>
        <TextField
          outlined
          placeholder='Search meetings'
          className={styles.searchField}
          value={query.search}
          onChange={(evt) => {
            const search = evt.currentTarget.value;
            setQuery((prev) => new MeetingsQuery({ ...prev, search }));
          }}
        />
      </div>
    </div>
  );
}

export default memo(SearchBar, dequal);
