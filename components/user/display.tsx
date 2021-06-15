import { FormEvent, Fragment, useCallback, useMemo } from 'react';
import { IconButton } from '@rmwc/icon-button';
import Image from 'next/image';
import Link from 'next/link';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Avatar from 'components/avatar';
import Button from 'components/button';
import EditIcon from 'components/icons/edit';
import FactCheckIcon from 'components/icons/fact-check';
import Placeholder from 'components/placeholder';
import RequestForm from 'components/user/request-form';

import { getEmailLink, getPhoneLink, join } from 'lib/utils';
import { User } from 'lib/model/user';
import { useOrg } from 'lib/context/org';
import useTrack from 'lib/hooks/track';
import { useUser } from 'lib/context/user';

import styles from './display.module.scss';

export interface UserDisplayProps {
  user?: User;
  langs: string[];
  subjects: string[];
}

export default function UserDisplay({
  user,
  langs,
  subjects,
}: UserDisplayProps): JSX.Element {
  const { org } = useOrg();
  const { orgs } = useUser();
  const { t, lang: locale } = useTranslation();

  const admin = useMemo(() => orgs.some((o) => user?.orgs.includes(o.id)), [
    orgs,
    user?.orgs,
  ]);

  const track = useTrack();
  const openPicktime = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      track('Match Linked Clicked');
      if (org?.matchURL) window.open(org.matchURL);
    },
    [track, org]
  );

  return (
    <main
      data-cy='user-display'
      className={cn(styles.main, { [styles.loading]: !user })}
    >
      <div className={styles.title}>
        <div className={styles.info}>
          <h1 data-cy='name' className={styles.name}>
            {user && user.name}
          </h1>
          <div data-cy='socials' className={styles.socials}>
            {(user?.socials || []).map((social, idx) => (
              <Fragment key={social.type}>
                {idx !== 0 && <span className={styles.dot}>·</span>}
                <a
                  data-cy={`${social.type}-social-link`}
                  rel='noopener noreferrer'
                  key={social.type}
                  target='_blank'
                  href={social.url}
                >
                  {t(`common:${social.type}`)}
                </a>
              </Fragment>
            ))}
            {!!user && !user.socials.length && <span>No social profiles</span>}
          </div>
        </div>
        {user && admin && (
          <div className={styles.contact}>
            {user.email && (
              <a
                href={getEmailLink(user)}
                rel='noopener noreferrer'
                target='_blank'
              >
                {user.email}
              </a>
            )}
            {user.phone && (
              <a
                href={getPhoneLink(user)}
                rel='noopener noreferrer'
                target='_blank'
              >
                {user.phone}
              </a>
            )}
          </div>
        )}
      </div>
      <div className={styles.header}>
        <a
          rel='noopener noreferrer'
          className={styles.avatar}
          href={user?.photo || ''}
          target='_blank'
          tabIndex={-1}
        >
          <Avatar
            className={styles.img}
            size={350}
            loading={!user}
            src={user?.photo}
            priority
          />
          {user && admin && (
            <div className={styles.actions}>
              <Link href={`/${org?.id || ''}/users/${user?.id || ''}/edit`}>
                <IconButton icon={<EditIcon />} label='Edit user' />
              </Link>
              <Link href={`/${org?.id || ''}/users/${user?.id || ''}/vet`}>
                <IconButton icon={<FactCheckIcon />} label='Vet user' />
              </Link>
            </div>
          )}
        </a>
        <a
          rel='noopener noreferrer'
          className={styles.background}
          href={user?.background || ''}
          target='_blank'
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
            {user.bio && <dt>About</dt>}
            {user.bio && <dd data-cy='bio'>{user.bio}</dd>}
            {!!subjects.length && <dt>Teaches</dt>}
            {!!subjects.length && <dd data-cy='subjects'>{join(subjects)}</dd>}
            {!!langs.length && <dt>Speaks</dt>}
            {!!langs.length && <dd data-cy='langs'>{join(langs)}</dd>}
            {user.timezone && <dt>Time Zone</dt>}
            {user.timezone && (
              <dd data-cy='timezone'>
                {new Date()
                  .toLocaleString(locale, {
                    year: 'numeric',
                    timeZone: user.timezone,
                    timeZoneName: 'long',
                  })
                  .split(', ')
                  .pop()}
              </dd>
            )}
          </dl>
        )}
        {!user && (
          <dl className={styles.content}>
            <dt className={styles.bio} />
            <dd className={styles.bio} />
            <dt className={styles.subjects} />
            <dd className={styles.subjects} />
            <dt className={styles.langs} />
            <dd className={styles.langs} />
          </dl>
        )}
        <div className={styles.form}>
          {user && !org?.matchURL && <RequestForm user={user} />}
          {user && org?.matchURL && (
            <form className={styles.picktime} onSubmit={openPicktime}>
              <Placeholder>
                {t('common:picktime-body', {
                  org: org.name,
                  user: user.firstName,
                })}
              </Placeholder>
              <Button label={t('common:picktime-btn')} raised arrow />
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
