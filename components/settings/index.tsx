import { ReactNode, useCallback, useMemo } from 'react';
import { Snackbar, SnackbarAction } from '@rmwc/snackbar';
import Link from 'next/link';
import axios from 'axios';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Header from 'components/header';

import { Org, OrgJSON } from 'lib/model/org';
import useContinuous from 'lib/hooks/continuous';
import { useUser } from 'lib/context/user';

import { SettingsContext } from './context';
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
    const { data } = await axios.put<OrgJSON>(url, updated);
    return Org.parse(data);
  }, []);

  const initialData = useMemo(
    () => orgs.find((o) => o.id === orgId) || Org.parse({}),
    [orgId, orgs]
  );
  const {
    data: org,
    setData: setOrg,
    loading,
    checked,
    error,
    retry,
    timeout,
  } = useContinuous(initialData, updateRemote, updateLocal);

  const settingsContextValue = useMemo(() => ({ org, setOrg }), [org, setOrg]);

  return (
    <>
      {loading && (
        <Snackbar message={t('settings:loading')} timeout={-1} leading open />
      )}
      {checked && <Snackbar message={t('settings:checked')} leading open />}
      {error && (
        <Snackbar
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
        body={t('settings:subtitle', { name: org ? `${org.name}'s` : 'your' })}
      />
      <div className={styles.wrapper}>
        <div className={styles.left}>
          <div className={styles.links}>
            <Link href={`/${orgId}/settings`}>
              <a className={cn({ [styles.active]: active === 'general' })}>
                {t('settings:general')}
              </a>
            </Link>
            <Link href={`/${orgId}/settings/home`}>
              <a className={cn({ [styles.active]: active === 'home' })}>
                {t('settings:home')}
              </a>
            </Link>
            <Link href={`/${orgId}/settings/signup`}>
              <a className={cn({ [styles.active]: active === 'signup' })}>
                {t('settings:signup')}
              </a>
            </Link>
          </div>
        </div>
        <div className={styles.right}>
          <SettingsContext.Provider value={settingsContextValue}>
            {children}
          </SettingsContext.Provider>
        </div>
      </div>
    </>
  );
}
