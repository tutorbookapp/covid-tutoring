import { memo, useCallback, useMemo } from 'react';
import { dequal } from 'dequal/lite';
import useTranslation from 'next-translate/useTranslation';

import Header from 'components/header';

import { Callback } from 'lib/model/callback';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { useOrg } from 'lib/context/org';

export interface CalendarHeaderProps {
  query: MeetingsQuery;
  setQuery: Callback<MeetingsQuery>;
}

function CalendarHeader({ query, setQuery }: CalendarHeaderProps): JSX.Element {
  const { org } = useOrg();
  const { t, lang: locale } = useTranslation();

  const title = useMemo(() => {
    const { from, to } = query;
    if (from.getMonth() !== to.getMonth())
      return `${from.toLocaleString(locale, {
        month: 'short',
        year: from.getFullYear() !== to.getFullYear() ? 'numeric' : undefined,
      })} - ${to.toLocaleString(locale, {
        month: 'short',
        year: 'numeric',
      })}`;
    return from.toLocaleString(locale, { month: 'long', year: 'numeric' });
  }, [query, locale]);

  const prevWeek = useCallback(() => {
    setQuery((prev) => {
      const to = new Date(prev.from);
      const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 7);
      return MeetingsQuery.parse({ ...prev, from, to });
    });
  }, [setQuery]);

  const nextWeek = useCallback(() => {
    setQuery((prev) => {
      const from = new Date(prev.to);
      const to = new Date(
        from.getFullYear(),
        from.getMonth(),
        from.getDate() + 7
      );
      return MeetingsQuery.parse({ ...prev, from, to });
    });
  }, [setQuery]);

  const today = useCallback(() => {
    setQuery((prev) => {
      const { from, to } = MeetingsQuery.parse({});
      if (dequal(from, prev.from) && dequal(to, prev.to)) return prev;
      return MeetingsQuery.parse({ ...prev, from, to });
    });
  }, [setQuery]);

  return (
    <Header
      header={title}
      body={t('calendar:subtitle', { name: org ? `${org.name}'s` : 'your' })}
      actions={[
        {
          label: 'Previous week',
          onClick: prevWeek,
        },
        {
          label: 'Next week',
          onClick: nextWeek,
        },
        {
          label: 'Today',
          onClick: today,
        },
      ]}
    />
  );
}

export default memo(CalendarHeader, dequal);
