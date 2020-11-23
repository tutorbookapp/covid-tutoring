import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import { EmptyHeader } from 'components/navigation';
import UserDisplay from 'components/users/display';
import Page from 'components/page';

import { User, UserJSON } from 'lib/model';
import getTruncatedUser from 'lib/api/get/truncated-user';
import getUser from 'lib/api/get/user';
import { usePage } from 'lib/hooks';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import match3rd from 'locales/en/match3rd.json';
import user from 'locales/en/user.json';

interface UserPageProps {
  user?: UserJSON;
}

function UserPage({ user: initialData }: UserPageProps): JSX.Element {
  const {
    query: { id },
  } = useRouter();
  const { data: user } = useSWR<UserJSON>(
    typeof id === 'string' ? `/api/users/${id}` : null,
    { initialData }
  );

  usePage('User Home');

  return (
    <Page title={`${user?.name || 'Loading'} - Tutorbook`}>
      <EmptyHeader />
      <UserDisplay user={user ? User.fromJSON(user) : undefined} />
    </Page>
  );
}

interface UserPageQuery extends ParsedUrlQuery {
  id: string;
}

// Only public (truncated) data is used when generating static pages. Once
// hydrated, SWR is used client-side to continually update the full page data.
export const getStaticProps: GetStaticProps<
  UserPageProps,
  UserPageQuery
> = async (ctx: GetStaticPropsContext<UserPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch user w/out params.');
  const user = getTruncatedUser(await getUser(ctx.params.id));
  return { props: { user: user.toJSON() }, revalidate: 1 };
};

export const getStaticPaths: GetStaticPaths<UserPageQuery> = async () => {
  return { paths: [], fallback: true };
};

export default withI18n(UserPage, { common, match3rd, user });
