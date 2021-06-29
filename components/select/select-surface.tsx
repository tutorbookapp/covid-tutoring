import { List, ListItem, ListItemGraphic } from '@rmwc/list';
import { MouseEvent, memo } from 'react';
import { Checkbox } from '@rmwc/checkbox';
import { dequal } from 'dequal/lite';

import { Option } from 'lib/model/query/base';

import styles from './select.module.scss';

// TODO: Debug why the `updateSelected` type doesn't work with `Select`.
export interface SelectSurfaceProps<O extends Option> {
  suggestions: O[];
  noResultsMessage: string;
  updateSelected: (option: any, event?: MouseEvent) => void;
  errored: boolean;
  value: O[];
}

function SelectSurface<O extends Option>({
  suggestions,
  noResultsMessage,
  updateSelected,
  errored,
  value,
}: SelectSurfaceProps<O>): JSX.Element {
  return (
    <List>
      {!suggestions.length && (
        <div className={styles.noResults}>
          {errored ? 'Errored, try again' : noResultsMessage}
        </div>
      )}
      {suggestions.map((opt) => (
        <ListItem
          key={
            typeof opt.value === 'string' || typeof opt.value === 'number'
              ? opt.value
              : opt.label
          }
          onClick={(evt: MouseEvent) => updateSelected(opt, evt)}
          className={styles.menuItem}
        >
          <ListItemGraphic
            icon={
              <Checkbox
                checked={value.some((s) => s.value === opt.value)}
                readOnly
              />
            }
          />
          {opt.label}
        </ListItem>
      ))}
    </List>
  );
}

export default memo(SelectSurface, dequal);
