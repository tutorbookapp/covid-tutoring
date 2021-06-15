import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import { EmptyHeader } from 'components/navigation';
import Page from 'components/page';
import UserEdit from 'components/user/edit';

import { Org, OrgJSON } from 'lib/model';
import { PageProps, getPageProps } from 'lib/page';
import { User, UserJSON } from 'lib/model';
import { OrgContext } from 'lib/context/org';
import getOrg from 'lib/api/get/org';
import getUser from 'lib/api/get/user';
import usePage from 'lib/hooks/page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import user from 'locales/en/user.json';

interface UserEditPageProps extends PageProps {
  user?: UserJSON;
  org?: OrgJSON;
}

function UserEditPage({
  user: initialData,
  org,
  ...props
}: UserEditPageProps): JSX.Element {
  const { query } = useRouter();
  const { data } = useSWR<UserJSON>(
    typeof query.id === 'string' ? `/api/users/${query.id}` : null,
    { initialData, revalidateOnMount: true }
  );

  usePage({
    name: 'User Edit',
    url: `/${query.org as string}/users/${query.id as string}/edit`,
    org: query.org as string,
    login: true,
    admin: true,
  });

  return (
    <OrgContext.Provider value={{ org: org ? Org.fromJSON(org) : undefined }}>
      <Page
        title={`${data?.name || 'Loading'} - Edit - Tutorbook`}
        formWidth
        {...props}
      >
        <EmptyHeader formWidth />
        <UserEdit user={data ? User.fromJSON(data) : undefined} />
      </Page>
    </OrgContext.Provider>
  );
}

interface UserEditPageQuery extends ParsedUrlQuery {
  org: string;
  id: string;
}

// Only public (truncated) data is used when generating static pages. Once
// hydrated, SWR is used client-side to continually update the full page data.
export const getStaticProps: GetStaticProps<
  UserEditPageProps,
  UserEditPageQuery
> = async (ctx: GetStaticPropsContext<UserEditPageQuery>) => {
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
export const getStaticPaths: GetStaticPaths<UserEditPageQuery> = async () => {
  return { paths: [], fallback: true };
};

export default withI18n(UserEditPage, { common, user });
