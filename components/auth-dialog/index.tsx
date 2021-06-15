import { useCallback, useState } from 'react';
import { Dialog } from '@rmwc/dialog';
import to from 'await-to-js';
import useTranslation from 'next-translate/useTranslation';

import Button from 'components/button';
import Loader from 'components/loader';

import { join, period } from 'lib/utils';
import { User } from 'lib/model';
import { loginWithGoogle } from 'lib/firebase/login';
import { useOrg } from 'lib/context/org';
import useTrack from 'lib/hooks/track';

import styles from './auth-dialog.module.scss';

export default function AuthDialog(): JSX.Element {
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { org } = useOrg();

  const track = useTrack();
  const onClick = useCallback(async () => {
    setError('');
    setLoggingIn(true);
    track('Google Login Started');
    const user = User.parse({ orgs: org ? [org.id] : ['default'] });
    const gsuite = !!org && !!org.domains.length;
    const [err] = await to(loginWithGoogle(user, gsuite));
    if (err) {
      track('Google Login Errored', { error: period(err.message) });
      setLoggingIn(false);
      setError(period(err.message));
    } else {
      setLoggingIn(false);
    }
  }, [track, org]);

  const { t } = useTranslation();

  return (
    <Dialog open preventOutsideDismiss>
      <div className={styles.wrapper}>
        <Loader active={loggingIn} />
        <div className={styles.nav}>
          {t('search:login-header', { name: org ? org.name : 'Organization' })}
        </div>
        <div className={styles.form}>
          <p className={styles.body}>
            {t('search:login-body', {
              name: org ? org.name : 'this organization',
              domains: org
                ? join(
                    org.domains.map((domain) => `@${domain}`),
                    'or'
                  )
                : 'organization',
            })}
          </p>
          <Button
            className={styles.btn}
            onClick={onClick}
            label={t('search:login-btn')}
            disabled={loggingIn}
            google
            raised
            arrow
          />
          {!!error && (
            <div data-cy='error' className={styles.error}>
              {t('search:login-err', { error })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
