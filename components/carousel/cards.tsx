import React from 'react';
import Link from 'next/link';
import { Ripple } from '@rmwc/ripple';
import cn from 'classnames';

import Avatar from 'components/avatar';

import { TCallback } from 'lib/model/callback';
import { User } from 'lib/model/user';

import styles from './cards.module.scss';

interface UserCardProps {
  onClick?: TCallback<React.SyntheticEvent<HTMLDivElement>>;
  href?: string;
  user: User;
}

function UserCardContent({ user }: { user: User }): JSX.Element {
  return (
    <>
      <div className={styles.img}>
        <Avatar size={160} src={user.photo} />
      </div>
      <div data-cy='name' className={styles.name}>
        {user.name}
      </div>
      <div data-cy='bio' className={styles.bio}>
        {user.bio}
      </div>
    </>
  );
}

export function UserCard({ user, onClick, href }: UserCardProps): JSX.Element {
  if (href)
    return (
      <Link href={href} passHref>
        <Ripple>
          <a data-cy='user-card' target='_blank' className={styles.card}>
            <UserCardContent user={user} />
          </a>
        </Ripple>
      </Link>
    );

  return (
    <Ripple>
      <div
        data-cy='user-card'
        tabIndex={0}
        className={styles.card}
        onClick={onClick}
      >
        <UserCardContent user={user} />
      </div>
    </Ripple>
  );
}

export function LoadingCard(): JSX.Element {
  return (
    <Ripple disabled>
      <div data-cy='loading-card' className={cn(styles.card, styles.loading)}>
        <div className={styles.img}>
          <Avatar size={160} loading />
        </div>
        <div className={`${styles.name} ${styles.loading}`} />
        <div className={`${styles.bio} ${styles.loading}`} />
      </div>
    </Ripple>
  );
}
