import { FormEvent, useCallback, useMemo } from 'react';
import { Select, SelectHTMLProps, SelectProps } from '@rmwc/select';

import { TCallback } from 'lib/model/callback';
import { getRecurString } from 'lib/utils';

// TODO: If the given value has an `until` property, render it as another
// pre-selected option. This allows users to reset the `until` property if
// necessary BUT we should still keep any explicit `exdates`.
const rrules: Record<string, string> = {
  Daily: 'RRULE:FREQ=DAILY',
  Weekly: 'RRULE:FREQ=WEEKLY',
  Biweekly: 'RRULE:FREQ=WEEKLY;INTERVAL=2',
  Monthly: 'RRULE:FREQ=MONTHLY',
};

export type RecurSelectProps = {
  value?: string;
  onChange: TCallback<string | undefined>;
} & Omit<SelectProps, 'value' | 'onChange'> &
  Omit<SelectHTMLProps, 'value' | 'onChange'>;

// TODO: Allow this to be rendered to portal by capturing clicks on the enhanced
// menu surface. See: https://github.com/jamesmfriedman/rmwc/pull/723
export default function RecurSelect({
  value,
  onChange,
  ...props
}: RecurSelectProps): JSX.Element {
  const onSelectChange = useCallback(
    (evt: FormEvent<HTMLSelectElement>) => {
      if (evt.currentTarget.value === getRecurString(value)) return;
      onChange(rrules[evt.currentTarget.value] || undefined);
    },
    [value, onChange]
  );
  const options = useMemo(
    () => [
      ...new Set([
        '',
        'Daily',
        'Weekly',
        'Biweekly',
        'Monthly',
        getRecurString(value),
      ]),
    ],
    [value]
  );

  return (
    <Select
      options={options}
      onChange={onSelectChange}
      value={getRecurString(value)}
      enhanced
      {...props}
    />
  );
}
