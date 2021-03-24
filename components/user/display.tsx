import { Fragment, useMemo } from 'react';
import { IconButton } from '@rmwc/icon-button';
import Image from 'next/image';
import Link from 'next/link';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Avatar from 'components/avatar';
import RequestForm from 'components/user/request-form';

import { User } from 'lib/model/user';
import { join } from 'lib/utils';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import styles from './display.module.scss';

export interface UserDisplayProps {
  user?: User;
  langs?: string[];
  subjects?: string[];
}

export default function UserDisplay({
  user,
  langs,
  subjects,
}: UserDisplayProps): JSX.Element {
  const { org } = useOrg();
  const { t, lang: locale } = useTranslation();
  const { orgs, user: currentUser } = useUser();

  const admin = useMemo(() => orgs.some((o) => user?.orgs.includes(o.id)), [
    orgs,
    user?.orgs,
  ]);

  return (
    <main
      data-cy='user-display'
      className={cn(styles.main, { [styles.loading]: !user })}
    >
      <div className={styles.title}>
        <h1 data-cy='name' className={styles.name}>
          {user && user.name}
        </h1>
        <div data-cy='socials' className={styles.socials}>
          {(user?.socials || []).map((social, idx) => (
            <Fragment key={social.type}>
              {idx !== 0 && <span className={styles.dot}>·</span>}
              <a
                data-cy={`${social.type}-social-link`}
                key={social.type}
                target='_blank'
                rel='noreferrer'
                href={social.url}
              >
                {t(`common:${social.type}`)}
              </a>
            </Fragment>
          ))}
          {user && !user.socials.length && <span>No social profiles</span>}
        </div>
      </div>
      <div className={styles.header}>
        <a
          className={styles.avatar}
          href={user?.photo || ''}
          target='_blank'
          rel='noreferrer'
          tabIndex={-1}
        >
          <Avatar
            className={styles.img}
            size={350}
            loading={!user}
            src={user?.photo}
            priority
          />
          {currentUser.id !== user?.id && admin && (
            <div className={styles.actions}>
              <Link href={`/${org?.id || ''}/users/${user?.id || ''}/edit`}>
                <IconButton icon='edit' label='Edit user' />
              </Link>
              <Link href={`/${org?.id || ''}/users/${user?.id || ''}/vet`}>
                <IconButton icon='fact_check' label='Vet user' />
              </Link>
            </div>
          )}
        </a>
        <a
          className={styles.background}
          href={user?.background || ''}
          target='_blank'
          rel='noreferrer'
          tabIndex={-1}
        >
          {user && (
            <div className={styles.backdrop}>
              <Image
                priority
                width={642}
                height={350}
                objectFit='cover'
                data-cy='backdrop'
                objectPosition='center 50%'
                src={user.background || user.photo}
                className={cn({ [styles.blurred]: !user.background })}
                alt=''
              />
            </div>
          )}
        </a>
      </div>
      <div className={styles.flex}>
        {user && (
          <dl className={styles.content}>
            <dt>About</dt>
            <dd data-cy='bio'>{user && user.bio}</dd>
            <dt>Time Zone</dt>
            <dd data-cy='timezone'>
              {user &&
                new Date()
                  .toLocaleString(locale, {
                    year: 'numeric',
                    timeZone: user.timezone,
                    timeZoneName: 'long',
                  })
                  .split(', ')
                  .pop()}
            </dd>
            <dt>Teaches</dt>
            <dd data-cy='subjects'>{join(subjects || [])}</dd>
            <dt>Speaks</dt>
            <dd data-cy='langs'>{join(langs || [])}</dd>
          </dl>
        )}
        {!user && (
          <dl className={styles.content}>
            <dt />
            <dd />
          </dl>
        )}
        <div className={styles.form}>{user && <RequestForm user={user} />}</div>
      </div>
    </main>
  );
}
