import { SyntheticEvent, useMemo } from 'react';
import Link from 'next/link';
import { Ripple } from '@rmwc/ripple';
import cn from 'classnames';

import Avatar from 'components/avatar';

import { TCallback, User } from 'lib/model';

import styles from './result.module.scss';

interface Props {
  user: User;
  className: string;
  onClick: TCallback<SyntheticEvent<HTMLElement>>;
  href: string;
  loading: boolean;
  avatar: boolean;
}

function ResultContent({
  user,
  className,
  loading,
  disabled,
  avatar = true,
}: Partial<Props> & { disabled: boolean }): JSX.Element {
  return (
    <li
      className={cn(styles.listItem, className, {
        [styles.disabled]: disabled,
        [styles.loading]: loading,
        [styles.avatar]: avatar,
      })}
    >
      {avatar && (
        <div className={styles.img}>
          <Avatar size={85} loading={loading} src={(user || {}).photo} />
        </div>
      )}
      <div className={styles.name}>{user && user.name}</div>
      <div className={styles.bio}>{user && user.bio}</div>
    </li>
  );
}

export default function Result({
  onClick,
  href,
  loading,
  ...rest
}: Partial<Props>): JSX.Element {
  const disabled = useMemo(() => loading || (!onClick && !href), [
    loading,
    onClick,
    href,
  ]);

  if (href)
    return (
      <Link href={href}>
        <a className={styles.link}>
          <Ripple disabled={disabled}>
            <ResultContent loading={loading} disabled={disabled} {...rest} />
          </Ripple>
        </a>
      </Link>
    );

  return (
    <Ripple disabled={disabled} onClick={onClick}>
      <ResultContent loading={loading} disabled={disabled} {...rest} />
    </Ripple>
  );
}
