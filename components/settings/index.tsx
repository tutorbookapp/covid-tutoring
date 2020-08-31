import { useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { Snackbar, SnackbarAction } from '@rmwc/snackbar';
import axios, { AxiosResponse } from 'axios';
import useTranslation from 'next-translate/useTranslation';
import to from 'await-to-js';
import cn from 'classnames';
import Link from 'next/link';

import Header from 'components/header';

import {
  isSignupPageConfig,
  isHomePageConfig,
  isAccount,
  isOrgJSON,
  Org,
  OrgJSON,
} from 'lib/model';
import { useContinuous } from 'lib/hooks';
import { useUser } from 'lib/account';

import { SettingsContext } from './context';
import Links from './links';
import styles from './settings.module.scss';

export interface SettingsProps {
  orgId: string;
  active: 'general' | 'home' | 'signup' | 'zoom';
  children: ReactNode;
}

export default function Settings({
  orgId,
  active,
  children,
}: SettingsProps): JSX.Element {
  const { t } = useTranslation();
  const { orgs, updateOrg } = useUser();

  const updateLocal = useCallback(
    async (updated: Org) => {
      await updateOrg(updated.id, updated);
    },
    [updateOrg]
  );
  const updateRemote = useCallback(async (updated: Org) => {
    const url = `/api/orgs/${updated.id}`;
    const { data } = await axios.put<OrgJSON>(url, updated.toJSON());
    return Org.fromJSON(data);
  }, []);

  const { error, retry, timeout, data: org, setData: setOrg } = useContinuous<
    Org
  >(new Org(), updateRemote, updateLocal);

  useEffect(() => {
    const idx = orgs.findIndex((o: Org) => o.id === orgId);
    if (idx >= 0) setOrg(orgs[idx]);
  }, [orgs, orgId, setOrg]);

  return (
    <>
      {error && (
        <Snackbar
          className={styles.snackbar}
          message={t('settings:error', { count: timeout / 1000 })}
          timeout={-1}
          action={
            <SnackbarAction label={t('settings:retry')} onClick={retry} />
          }
          leading
          open
        />
      )}
      <Header
        header={t('common:settings')}
        body={t('settings:subtitle', { name: org.name || 'your organization' })}
      />
      <div className={styles.wrapper}>
        <div className={styles.left}>
          <div className={styles.links}>
            <Link href='/[org]/settings' as={`/${orgId}/settings`}>
              <a className={cn({ [styles.active]: active === 'general' })}>
                {t('settings:general')}
              </a>
            </Link>
            <Link href='/[org]/settings/home' as={`/${orgId}/settings/home`}>
              <a className={cn({ [styles.active]: active === 'home' })}>
                {t('settings:home')}
              </a>
            </Link>
            <Link
              href='/[org]/settings/signup'
              as={`/${orgId}/settings/signup`}
            >
              <a className={cn({ [styles.active]: active === 'signup' })}>
                {t('settings:signup')}
              </a>
            </Link>
          </div>
        </div>
        <div className={styles.right}>
          <SettingsContext.Provider value={{ org, setOrg }}>
            {children}
          </SettingsContext.Provider>
        </div>
      </div>
    </>
  );
}
