import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import Home from 'components/settings/home';
import Page from 'components/page';
import Settings from 'components/settings';
import { TabHeader } from 'components/navigation';

import { PageProps, getPageProps } from 'lib/page';
import { OrgContext } from 'lib/context/org';
import { usePage } from 'lib/hooks';
import { useUser } from 'lib/context/user';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import orgIntl from 'locales/en/org.json';
import settings from 'locales/en/settings.json';

function HomeSettingsPage(props: PageProps): JSX.Element {
  const { orgs } = useUser();
  const { query } = useRouter();
  const { t } = useTranslation();

  const org = useMemo(() => {
    const idx = orgs.findIndex((o) => o.id === query.org);
    if (idx < 0) return;
    return orgs[idx];
  }, [orgs, query.org]);

  usePage({
    name: 'Org Home Settings',
    url: `/${query.org as string}/settings/home`,
    org: query.org as string,
    login: true,
    admin: true,
  });

  return (
    <OrgContext.Provider value={{ org }}>
      <Page
        title={`${org?.name || 'Loading'} - Home - Settings - Tutorbook`}
        {...props}
      >
        <TabHeader
          switcher
          tabs={[
            {
              label: t('common:overview'),
              href: `/${query.org as string}/overview`,
            },
            {
              label: t('common:users'),
              href: `/${query.org as string}/users`,
            },
            {
              label: t('common:matches'),
              href: `/${query.org as string}/matches`,
            },
            {
              label: t('common:calendar'),
              href: `/${query.org as string}/calendar`,
            },
            {
              active: true,
              label: t('common:settings'),
              href: `/${query.org as string}/settings`,
            },
          ]}
        />
        <Settings active='home' orgId={query.org as string}>
          <Home />
        </Settings>
      </Page>
    </OrgContext.Provider>
  );
}

export const getStaticProps = getPageProps;

export default withI18n(HomeSettingsPage, { common, settings, org: orgIntl });
