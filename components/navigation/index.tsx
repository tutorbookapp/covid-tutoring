import { useState } from 'react';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Avatar from 'components/avatar';
import FilterForm from 'components/filter-form';

import { Callback, TCallback } from 'lib/model';
import { Aspect } from 'lib/model';
import { UsersQuery } from 'lib/model';
import Link from 'lib/intl/link';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import Tabs, { TabsProps } from './tabs';
import PopOver from './pop-over';
import Switcher from './switcher';
import styles from './navigation.module.scss';

interface DesktopTabsProps {
  aspect: Aspect;
  onChange: TCallback<Aspect>;
}

function DesktopTabs({ aspect, onChange }: DesktopTabsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Tabs
      tabs={[
        {
          label: t('common:mentors'),
          active: aspect === 'mentoring',
          onClick: () => onChange('mentoring'),
        },
        {
          label: t('common:tutors'),
          active: aspect === 'tutoring',
          onClick: () => onChange('tutoring'),
        },
      ]}
    />
  );
}

function Logo(): JSX.Element {
  const { user } = useUser();
  const { org } = useOrg();

  return (
    <Link href={user.id ? '/overview' : `/${org?.id || ''}`}>
      <a className={styles.logo}>
        <span>TB</span>
      </a>
    </Link>
  );
}

function DesktopNav(): JSX.Element {
  const { user, loggedIn } = useUser();
  const { org } = useOrg();
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className={styles.desktopLinks}>
      {loggedIn === false && (
        <>
          <Link href='/login'>
            <a className={`${styles.desktopLink} ${styles.loginLink}`}>
              {t('common:login')}
            </a>
          </Link>
          <Link href={`/${org?.id || user.orgs[0] || 'default'}/signup`}>
            <a className={`${styles.desktopLink} ${styles.signupLink}`}>
              {t('common:signup')}
            </a>
          </Link>
        </>
      )}
      {loggedIn === undefined && (
        <div className={styles.avatar}>
          <Avatar size={40} loading />
        </div>
      )}
      {loggedIn === true && (
        <PopOver open={open} onClose={() => setOpen(false)}>
          <button
            type='button'
            id='open-nav'
            className={styles.avatar}
            onClick={() => setOpen(true)}
          >
            <Avatar size={40} src={user.photo} />
          </button>
        </PopOver>
      )}
    </div>
  );
}

interface TabHeaderProps extends TabsProps {
  switcher?: boolean;
}

export function TabHeader({ switcher, ...rest }: TabHeaderProps): JSX.Element {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Logo />
          {switcher && <Switcher />}
          <Tabs {...rest} />
        </div>
        <div className={styles.right}>
          <DesktopNav />
        </div>
      </header>
    </div>
  );
}

interface EmptyHeaderProps {
  formWidth?: boolean;
}

export function EmptyHeader({ formWidth }: EmptyHeaderProps): JSX.Element {
  return (
    <div className={cn(styles.wrapper, { [styles.formWidth]: formWidth })}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Logo />
        </div>
        <div className={styles.right}>
          <DesktopNav />
        </div>
      </header>
    </div>
  );
}

interface AspectHeaderProps extends EmptyHeaderProps {
  aspect: Aspect;
  onChange: TCallback<Aspect>;
}

export function AspectHeader({
  aspect,
  onChange,
  formWidth,
}: AspectHeaderProps): JSX.Element {
  return (
    <div className={cn(styles.wrapper, { [styles.formWidth]: formWidth })}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Logo />
          <DesktopTabs aspect={aspect} onChange={onChange} />
        </div>
        <div className={styles.right}>
          <DesktopNav />
        </div>
      </header>
    </div>
  );
}

interface QueryHeaderProps extends EmptyHeaderProps {
  query: UsersQuery;
  onChange: Callback<UsersQuery>;
  aspects: Aspect[];
}

export function QueryHeader({
  query,
  onChange,
  aspects,
  formWidth,
}: QueryHeaderProps): JSX.Element {
  return (
    <div className={cn(styles.wrapper, { [styles.formWidth]: formWidth })}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Logo />
          {aspects.length > 1 && (
            <DesktopTabs
              aspect={query.aspect}
              onChange={(aspect: Aspect) =>
                onChange(new UsersQuery({ ...query, aspect }))
              }
            />
          )}
        </div>
        <div className={styles.center}>
          <FilterForm query={query} onChange={onChange} />
        </div>
        <div className={styles.right}>
          <DesktopNav />
        </div>
      </header>
    </div>
  );
}
