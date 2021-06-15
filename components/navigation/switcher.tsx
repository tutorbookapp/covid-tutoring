import { MenuSurface, MenuSurfaceAnchor } from '@rmwc/menu';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import AddIcon from 'components/icons/add';
import Intercom from 'lib/intercom';

import { Org } from 'lib/model';
import { useUser } from 'lib/context/user';

import { PopOverAccountLink, PopOverButton } from './pop-over';
import styles from './pop-over.module.scss';

export default function Switcher(): JSX.Element {
  const { t } = useTranslation();
  const { pathname, query } = useRouter();
  const { user, orgs } = useUser();

  const [open, setOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>('Account');

  useEffect(() => {
    const idx = orgs.findIndex((o: Org) => o.id === query.org);
    if (idx < 0) return setSelected('Account');
    return setSelected(orgs[idx].name);
  }, [orgs, query]);

  const destination = useMemo(() => {
    if (!pathname.includes('[org]')) {
      if (pathname.includes('matches')) return 'matches';
      if (pathname.includes('calendar')) return 'calendar';
      if (pathname.includes('profile')) return 'settings';
      return 'overview';
    }
    return pathname.split('/').slice(2).join('/');
  }, [pathname]);
  const personalDestination = useMemo(() => {
    if (pathname.includes('matches')) return '/matches';
    if (pathname.includes('calendar')) return '/calendar';
    if (pathname.includes('settings')) return '/profile';
    return '/overview';
  }, [pathname]);

  return (
    <MenuSurfaceAnchor>
      <MenuSurface
        className={styles.menu}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div data-cy='switcher-list' className={styles.picker}>
          <div className={styles.header}>{t('common:personal-account')}</div>
          <PopOverAccountLink account={user} href={personalDestination} />
          {orgs && !!orgs.length && (
            <>
              <div className={styles.line} />
              <div className={styles.header}>{t('common:organizations')}</div>
              {orgs.map((org: Org) => (
                <PopOverAccountLink
                  key={org.id}
                  account={org}
                  href={`/${org.id}/${destination}`}
                />
              ))}
            </>
          )}
          <div className={styles.line} />
          <PopOverButton
            icon={<AddIcon />}
            onClick={() => Intercom('showNewMessage', t('common:new-org-msg'))}
          >
            {t('common:new-org-btn')}
          </PopOverButton>
        </div>
      </MenuSurface>

      <div className={styles.selector}>
        <button
          type='button'
          onClick={() => setOpen(true)}
          data-cy='switcher-btn'
          aria-expanded={open}
          aria-haspopup
          className={styles.button}
        >
          <div className={styles.wrapper}>
            <div className={styles.selected}>
              <span className={styles.selectedText}>{selected}</span>
            </div>
            <div className={styles.arrowWrapper}>
              <div className={styles.arrow} />
            </div>
          </div>
        </button>
      </div>
    </MenuSurfaceAnchor>
  );
}
