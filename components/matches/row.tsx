import { DataTableCell, DataTableRow } from '@rmwc/data-table';
import Link from 'next/link';
import { useMemo } from 'react';

import { MatchJSON } from 'lib/model';
import { join } from 'lib/utils';

import styles from './matches.module.scss';

interface MatchRowProps {
  match: MatchJSON;
}

export function MatchRow({ match }: MatchRowProps) {
  const peopleNames = useMemo(() => {
    const names: string[] = [];
    match.people.forEach((p) => {
      if (p.name) names.push(`${p.name} (${join(p.roles) || 'other'})`);
    });
    const diff = match.people.length - names.length;
    if (diff > 0) names.push(`${diff} more`);
    return names;
  }, [match.people]);

  return (
    <Link href={`/${match.org}/matches/${match.id}`}>
      <DataTableRow data-cy='match-row'>
        <DataTableCell className={styles.people}>
          {join(peopleNames)}
        </DataTableCell>
        <DataTableCell className={styles.subjects}>
          {join(match.subjects)}
        </DataTableCell>
        <DataTableCell className={styles.message}>
          {match.message}
        </DataTableCell>
      </DataTableRow>
    </Link>
  );
}

export function LoadingRow(): JSX.Element {
  return (
    <DataTableRow className={styles.loading}>
      <DataTableCell className={styles.people} />
      <DataTableCell className={styles.subjects} />
      <DataTableCell className={styles.message} />
    </DataTableRow>
  );
}
