import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import useTranslation from 'next-translate/useTranslation';

import { EmptyHeader } from 'components/navigation';
import Page from 'components/page';
import UserDisplay from 'components/user/display';

import { Aspect, isAspect } from 'lib/model/aspect';
import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { User, UserJSON } from 'lib/model/user';
import { getLangLabels, getSubjectLabels } from 'lib/intl/utils';
import { OrgContext } from 'lib/context/org';
import getOrg from 'lib/api/get/org';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUser from 'lib/api/get/user';
import usePage from 'lib/hooks/page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import error from 'locales/en/error.json';
import match3rd from 'locales/en/match3rd.json';
import user3rd from 'locales/en/user3rd.json';

// We send the `subjects` and `langs` of the user properly translated as props
// so as to avoid a flash of invalid data (e.g. locale codes instead of labels).
interface UserDisplayPageProps extends PageProps {
  org?: OrgJSON;
  user?: UserJSON;
  langs?: string[];
  subjects?: { [key in Aspect]: string[] };
}

function UserDisplayPage({
  org,
  user: initialData,
  langs: initialLangs,
  subjects: initialSubjects,
  ...props
}: UserDisplayPageProps): JSX.Element {
  const { query } = useRouter();

  // TODO: The router query should update before Next.js fetches static props.
  // That way, SWR will fetch the full user data while Next.js fetches the
  // static props and SWR will then ignore the truncated data.
  // @see {@link https://github.com/vercel/next.js/issues/19492}
  const { data } = useSWR<UserJSON>(
    typeof query.id === 'string' ? `/api/users/${query.id}` : null,
    { initialData, revalidateOnMount: true }
  );
  const [langs, setLangs] = useState<string[]>(initialLangs || []);
  const [subjects, setSubjects] = useState<{ [key in Aspect]: string[] }>(
    initialSubjects || {
      tutoring: [],
      mentoring: [],
    }
  );

  useEffect(() => setLangs((p) => initialLangs || p), [initialLangs]);
  useEffect(() => setSubjects((p) => initialSubjects || p), [initialSubjects]);

  const { lang: locale } = useTranslation();
  useEffect(() => {
    async function fetchLangs(): Promise<void> {
      if (data) setLangs(await getLangLabels(data.langs, locale));
    }
    void fetchLangs();
  }, [data, locale]);
  useEffect(() => {
    async function fetchSubjects(): Promise<void> {
      if (!data) return;
      const [tutoring, mentoring] = await Promise.all([
        getSubjectLabels(data.tutoring.subjects, locale),
        getSubjectLabels(data.mentoring.subjects, locale),
      ]);
      setSubjects({ tutoring, mentoring });
    }
    void fetchSubjects();
  }, [data, locale]);

  const subjectsDisplayed = useMemo(() => {
    if (org?.aspects.length === 1) return subjects[org.aspects[0]];
    if (isAspect(query.aspect)) return subjects[query.aspect];
    // Many subjects can be both tutoring and mentoring subjects, thus we filter
    // for unique subjects (e.g. to prevent "Computer Science" duplications).
    const unique = new Set<string>();
    subjects.tutoring.forEach((s) => unique.add(s));
    subjects.mentoring.forEach((s) => unique.add(s));
    return [...unique];
  }, [org, query.aspect, subjects]);

  usePage({ name: 'User Display', org: org?.id });

  return (
    <OrgContext.Provider value={{ org: org ? Org.fromJSON(org) : undefined }}>
      <Page
        title={`${data?.name || 'Loading'} - Tutorbook`}
        description={data?.bio}
        {...props}
      >
        <EmptyHeader />
        <UserDisplay
          user={data ? User.fromJSON(data) : undefined}
          subjects={subjectsDisplayed}
          langs={langs}
        />
      </Page>
    </OrgContext.Provider>
  );
}

interface UserDisplayPageQuery extends ParsedUrlQuery {
  org: string;
  id: string;
}

// Only public (truncated) data is used when generating static pages. Once
// hydrated, SWR is used client-side to continually update the full page data.
export const getStaticProps: GetStaticProps<
  UserDisplayPageProps,
  UserDisplayPageQuery
> = async (ctx: GetStaticPropsContext<UserDisplayPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org and user w/out params.');
  try {
    const [org, user] = await Promise.all([
      getOrg(ctx.params.org),
      getUser(ctx.params.id),
    ]);
    const [langs, tutoring, mentoring] = await Promise.all([
      getLangLabels(user.langs),
      getSubjectLabels(user.tutoring.subjects),
      getSubjectLabels(user.mentoring.subjects),
    ]);
    const { props } = await getPageProps();
    // Note that because Next.js cannot expose the `req` object when fetching
    // static props, there are a couple of possible data change flashes:
    // 1. If the user is an admin, the user's full name and the "edit" and "vet"
    //    icon buttons will appear after SWR fetches the user data client-side.
    // 2. If there is an `aspect` specified as a query parameter, the user's
    //    "teaches" section could change.
    return {
      props: {
        langs,
        org: org.toJSON(),
        subjects: { tutoring, mentoring },
        user: getTruncatedUser(user).toJSON(),
        ...props,
      },
      revalidate: 1,
    };
  } catch (e) {
    return { notFound: true };
  }
};

export const getStaticPaths: GetStaticPaths<UserDisplayPageQuery> = async () => {
  return { paths: [], fallback: true };
};

export default withI18n(UserDisplayPage, { common, error, match3rd, user3rd });
