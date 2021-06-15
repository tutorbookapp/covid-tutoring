import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import { EmptyHeader } from 'components/navigation';
import Page from 'components/page';
import UserVet from 'components/user/vet';

import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { User, UserJSON } from 'lib/model/user';
import { OrgContext } from 'lib/context/org';
import getOrg from 'lib/api/get/org';
import getUser from 'lib/api/get/user';
import usePage from 'lib/hooks/page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import user from 'locales/en/user.json';

interface UserVetPageProps extends PageProps {
  user?: UserJSON;
  org?: OrgJSON;
}

function UserVetPage({
  user: initialData,
  org,
  ...props
}: UserVetPageProps): JSX.Element {
  const { query } = useRouter();
  const { data } = useSWR<UserJSON>(
    typeof query.id === 'string' ? `/api/users/${query.id}` : null,
    { initialData, revalidateOnMount: true }
  );

  usePage({
    name: 'User Vet',
    url: `/${query.org as string}/users/${query.id as string}/vet`,
    org: query.org as string,
    login: true,
    admin: true,
  });

  return (
    <OrgContext.Provider value={{ org: org ? Org.parse(org) : undefined }}>
      <Page
        title={`${data?.name || 'Loading'} - Vet - Tutorbook`}
        formWidth
        {...props}
      >
        <EmptyHeader formWidth />
        <UserVet user={data ? User.parse(data) : undefined} />
      </Page>
    </OrgContext.Provider>
  );
}

interface UserVetPageQuery extends ParsedUrlQuery {
  org: string;
  id: string;
}

// Only public (truncated) data is used when generating static pages. Once
// hydrated, SWR is used client-side to continually update the full page data.
export const getStaticProps: GetStaticProps<
  UserVetPageProps,
  UserVetPageQuery
> = async (ctx: GetStaticPropsContext<UserVetPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org and user w/out params.');
  try {
    const [org, user] = await Promise.all([
      getOrg(ctx.params.org),
      getUser(ctx.params.id),
    ]);
    const { props } = await getPageProps();
    return {
      props: { org: org.toJSON(), user: user.toJSON(), ...props },
      revalidate: 1,
    };
  } catch (e) {
    return { notFound: true };
  }
};

// TODO: We want to statically generate skeleton loading pages for each org.
// @see {@link https://github.com/vercel/next.js/issues/14200}
// @see {@link https://github.com/vercel/next.js/discussions/14486}
export const getStaticPaths: GetStaticPaths<UserVetPageQuery> = async () => {
  return { paths: [], fallback: true };
};

export default withI18n(UserVetPage, { common, user });
