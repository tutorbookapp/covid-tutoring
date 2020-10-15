import ErrorPage from 'next/error';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import { TabHeader } from 'components/navigation';
import People from 'components/people';
import Page from 'components/page';

import { useLoggedIn } from 'lib/hooks';
import { useUser } from 'lib/account';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import people from 'locales/en/people.json';
import search from 'locales/en/search.json';
import query from 'locales/en/query.json';
import user from 'locales/en/user.json';
import match from 'locales/en/match.json';
import request from 'locales/en/request.json';

function PeoplePage(): JSX.Element {
  const { orgs, loggedIn } = useUser();
  const { query: params } = useRouter();
  const { t } = useTranslation();

  const org = useMemo(() => {
    const idx = orgs.findIndex((o) => o.id === params.org);
    if (idx < 0) return;
    return orgs[idx];
  }, [orgs, params.org]);

  useLoggedIn('/[org]/people', `/${params.org as string}/people`);

  return (
    <>
      {!!loggedIn && !org && (
        <ErrorPage statusCode={401} title={t('common:not-org-member')} />
      )}
      {!!org && (
        <Page title={`${org.name} - People - Tutorbook`}>
          <TabHeader
            tabs={[
              {
                label: t('common:overview'),
                active: false,
                href: '/[org]/dashboard',
                as: `/${params.org as string}/dashboard`,
              },
              {
                label: t('common:people'),
                active: true,
                href: '/[org]/people',
                as: `/${params.org as string}/people`,
              },
              {
                label: t('common:matches'),
                active: false,
                href: '/[org]/matches',
                as: `/${params.org as string}/matches`,
              },
              {
                label: t('common:settings'),
                active: false,
                href: '/[org]/settings',
                as: `/${params.org as string}/settings`,
              },
            ]}
          />
          <People org={org} />
        </Page>
      )}
    </>
  );
}

export default withI18n(PeoplePage, {
  common,
  people,
  search,
  query,
  user,
  match,
  request,
});
