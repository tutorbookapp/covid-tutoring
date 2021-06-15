import { Ripple } from '@rmwc/ripple';
import cn from 'classnames';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';

import Avatar from 'components/avatar';

import { Match } from 'lib/model';
import { Person } from 'lib/model';
import { join } from 'lib/utils';

import styles from './result.module.scss';

export interface MatchResultProps {
  match?: Match;
  onClick?: () => void;
  className?: string;
  ripple?: boolean;
}

export default function MatchResult({
  match,
  onClick,
  className,
  ripple = true,
}: MatchResultProps): JSX.Element {
  const content = useMemo(
    () => (
      <div
        className={cn(styles.result, className, { [styles.loading]: !match })}
        onClick={onClick}
      >
        {(match?.people || Array(2).fill(null)).map((person: Person | null) => (
          <div key={person?.id || nanoid()} className={styles.person}>
            <div className={styles.avatar}>
              <Avatar src={person?.photo} loading={!person} size={85} />
            </div>
            <div className={styles.name}>{person?.name || ''}</div>
            <div className={styles.roles}>{join(person?.roles || [])}</div>
          </div>
        ))}
        <div className={styles.info}>
          <dl>
            <dt>{match && 'Subjects'}</dt>
            <dd className={styles.subjects}>{join(match?.subjects || [])}</dd>
          </dl>
          <dl>
            <dt>{match && 'Message'}</dt>
            <dd className={styles.message}>{match?.message || ''}</dd>
          </dl>
        </div>
      </div>
    ),
    [match, onClick, className]
  );

  if (!ripple) return content;
  return (
    <Ripple disabled={!match} onClick={onClick}>
      {content}
    </Ripple>
  );
}
