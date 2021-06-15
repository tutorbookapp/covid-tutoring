import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import { EmptyHeader } from 'components/navigation';
import Home from 'components/home';
import Page from 'components/page';

import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { OrgContext } from 'lib/context/org';
import supabase from 'lib/api/supabase';
import usePage from 'lib/hooks/page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import home from 'locales/en/home.json';

interface HomePageProps extends PageProps {
  org?: OrgJSON;
}

function HomePage({ org: initialData, ...props }: HomePageProps): JSX.Element {
  const { query } = useRouter();
  const { data: org } = useSWR(
    typeof query.org === 'string' ? `/api/orgs/${query.org}` : null,
    { initialData, revalidateOnMount: true }
  );

  usePage({ name: 'Org Home', org: org?.id });

  return (
    <OrgContext.Provider value={{ org: org ? Org.parse(org) : undefined }}>
      <Page
        title={`${org?.name || 'Loading'} - Tutorbook`}
        description={org?.bio}
        formWidth
        intercom
        {...props}
      >
        <EmptyHeader formWidth />
        <Home org={org ? Org.parse(org) : undefined} />
      </Page>
    </OrgContext.Provider>
  );
}

interface HomePageQuery extends ParsedUrlQuery {
  org: string;
}

export const getStaticProps: GetStaticProps<
  HomePageProps,
  HomePageQuery
> = async (ctx: GetStaticPropsContext<HomePageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org w/out params.');
  const { data } = await supabase.from<Org>('orgs').select().eq('id', ctx.params.org);
  if (!data || !data[0]) return { notFound: true };
  const org = Org.parse(data[0]);
  const { props } = await getPageProps();
  return { props: { org: org.toJSON(), ...props }, revalidate: 1 };
};

export const getStaticPaths: GetStaticPaths<HomePageQuery> = async () => {
  const { data } = await supabase.from<Org>('orgs').select();
  const paths = (data || []).map((org) => ({ params: { org: org.id } }));
  return { paths, fallback: true };
};

export default withI18n(HomePage, { common, home });
