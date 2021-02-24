import useTranslation from 'next-translate/useTranslation';

import Calendar from 'components/calendar';
import Page from 'components/page';
import { TabHeader } from 'components/navigation';

import { PageProps, getPageProps } from 'lib/page';
import { usePage } from 'lib/hooks';
import { withI18n } from 'lib/intl';

import calendar from 'locales/en/calendar.json';
import common from 'locales/en/common.json';
import match from 'locales/en/match.json';
import meeting from 'locales/en/meeting.json';

function CalendarPage(props: PageProps): JSX.Element {
  const { t } = useTranslation();

  usePage({ name: 'Calendar', url: '/calendar', login: true });

  return (
    <Page title='Calendar - Tutorbook' {...props}>
      <TabHeader
        switcher
        tabs={[
          {
            label: t('common:overview'),
            href: '/overview',
          },
          {
            label: t('common:matches'),
            href: '/matches',
          },
          {
            active: true,
            label: t('common:calendar'),
            href: '/calendar',
          },
          {
            label: t('common:profile'),
            href: '/profile',
          },
        ]}
      />
      <Calendar user />
    </Page>
  );
}

export const getStaticProps = getPageProps;

export default withI18n(CalendarPage, { calendar, common, match, meeting });
