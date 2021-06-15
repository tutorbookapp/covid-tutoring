import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { dequal } from 'dequal/lite';
import useTranslation from 'next-translate/useTranslation';

import AuthDialog from 'components/auth-dialog';
import Page from 'components/page';
import { QueryHeader } from 'components/navigation';
import Search from 'components/search';

import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { CallbackParam } from 'lib/model/callback';
import { ListUsersRes } from 'lib/api/routes/users/list';
import { OrgContext } from 'lib/context/org';
import { User } from 'lib/model/user';
import { UsersQuery } from 'lib/model/query/users';
import { accountToSegment } from 'lib/model/account';
import clone from 'lib/utils/clone';
import { prefetch } from 'lib/fetch';
import supabase from 'lib/api/supabase';
import useAnalytics from 'lib/hooks/analytics';
import usePage from 'lib/hooks/page';
import useTrack from 'lib/hooks/track';
import useURLParamSync from 'lib/hooks/url-param-sync';
import { useUser } from 'lib/context/user';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import match3rd from 'locales/en/match3rd.json';
import query3rd from 'locales/en/query3rd.json';
import search from 'locales/en/search.json';

interface SearchPageProps extends PageProps {
  org?: OrgJSON;
}

function SearchPage({ org, ...props }: SearchPageProps): JSX.Element {
  usePage({ name: 'Org Search', org: org?.id });

  const { t } = useTranslation();
  const { user: currentUser, orgs, loggedIn } = useUser();

  const [query, setQuery] = useState<UsersQuery>(UsersQuery.parse({}));
  const [hits, setHits] = useState<number>(query.hitsPerPage);
  const [auth, setAuth] = useState<boolean>(false);
  const [canSearch, setCanSearch] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(true);

  useURLParamSync(query, setQuery, UsersQuery, [
    'orgs',
    'available',
    'visible',
  ]);

  const { data, isValidating } = useSWR<ListUsersRes>(
    canSearch ? query.endpoint : null
  );

  /**
   * If the user isn't a part of this org, attempt to add them using the
   * `/api/users` endpoint. If that endpoint errors, show an undismissable
   * dialog explaining the error (includes an org-configurable prompt too).
   * @todo Add this validation to the back-end as well.
   * @see {@link https://github.com/tutorbookapp/tutorbook/issues/115}
   */
  useEffect(() => {
    if (!org || loggedIn === undefined) {
      setAuth(false);
      setCanSearch(false);
    } else if (
      currentUser.orgs.includes(org.id) ||
      !org.domains.length ||
      org.domains.some((d: string) => currentUser.email.endsWith(`@${d}`)) ||
      orgs.some(({ id }) => id === org.id)
    ) {
      setAuth(false);
      setCanSearch(true);
    } else {
      setAuth(true);
      setCanSearch(false);
    }
  }, [loggedIn, currentUser, org, orgs]);

  // Save the number of hits from the last successful request.
  useEffect(() => setHits((prev) => data?.hits || prev), [data?.hits]);

  // Prefetch the next page of results (using SWR's global cache).
  // @see {@link https://swr.vercel.app/docs/prefetching}
  useEffect(() => {
    const nextPageQuery = UsersQuery.parse(
      clone({ ...query, page: query.page + 1 })
    );
    void prefetch(nextPageQuery.endpoint);
  }, [query]);

  // TODO: Perhaps we should only allow filtering by a single org, as we don't
  // ever filter by more than one at once.
  useEffect(() => {
    setQuery((prev: UsersQuery) => {
      const updated = UsersQuery.parse({
        ...prev,
        available: true,
        visible: true,
      });
      if (!org) return dequal(prev, updated) ? prev : updated;
      if (!org.aspects.includes(prev.aspect)) [updated.aspect] = org.aspects;
      updated.orgs = [org.id];
      return dequal(prev, updated) ? prev : updated;
    });
  }, [org, query]);

  // TODO: Investigate why I'm still using this `useSWR` refresh workaround. I
  // should get rid of it when updating the `Query` object definitions.
  useEffect(() => {
    setSearching(true);
    void mutate(query.endpoint);
  }, [query]);

  // TODO: Debug issues where `searching` stays true even after we receive data
  // when the user continuously clicks the pagination buttons.
  useEffect(() => {
    setSearching((prev) => prev && (isValidating || !data));
  }, [isValidating, data]);

  const results = useMemo(() => (data ? data.users : []), [data]);

  const track = useTrack();
  const onQueryChange = useCallback(
    (param: CallbackParam<UsersQuery>) => {
      let updated = query;
      if (typeof param === 'object') updated = param;
      if (typeof param === 'function') updated = param(updated);
      setQuery(updated);
      track(
        'User List Filtered',
        {
          org: org ? accountToSegment(Org.parse(org)) : undefined,
          subjects: updated.subjects.map((o) => o.value).join(' AND '),
          langs: updated.langs.map((o) => o.value).join(' AND '),
          aspect: updated.aspect,
        },
        2500
      );
    },
    [track, query, org]
  );

  // Uses the object-action framework event naming and known ecommerce events.
  // @see {@link https://segment.com/docs/connections/spec/ecommerce/v2/#product-list-filtered}
  // @see {@link https://segment.com/academy/collecting-data/naming-conventions-for-clean-data}
  const url = useMemo(() => {
    if (typeof window === 'undefined') return 'https://tutorbook.org';
    return `${window.location.protocol}//${window.location.host}`;
  }, []);
  useAnalytics(
    'User List Loaded',
    () =>
      !searching && {
        org: org ? accountToSegment(Org.parse(org)) : undefined,
        subjects: query.subjects.map((o) => o.value).join(' AND '),
        langs: query.langs.map((o) => o.value).join(' AND '),
        aspect: query.aspect,
        users: results.map((res, idx) => ({
          ...accountToSegment(User.parse(res)),
          position: idx,
          url: `${url}/${org?.id || 'default'}/search/${res.id}`,
          subjects: res[query.aspect].subjects,
        })),
      }
  );

  return (
    <OrgContext.Provider value={{ org: org ? Org.parse(org) : undefined }}>
      <Page
        title={`${org?.name || 'Loading'} - Search - Tutorbook`}
        description={t('search:description', {
          name: org?.name || 'this organization',
          bio: org?.bio ? ` ${org.bio}` : '',
        })}
        {...props}
      >
        <QueryHeader
          aspects={org ? org.aspects : ['mentoring', 'tutoring']}
          query={query}
          onChange={onQueryChange}
        />
        {auth && <AuthDialog />}
        <Search
          hits={hits}
          query={query}
          results={results}
          searching={searching || !canSearch}
          onChange={onQueryChange}
        />
      </Page>
    </OrgContext.Provider>
  );
}

interface SearchPageQuery extends ParsedUrlQuery {
  org: string;
}

// TODO: Incrementally statically generate each empty aspect query.
export const getStaticProps: GetStaticProps<
  SearchPageProps,
  SearchPageQuery
> = async (ctx: GetStaticPropsContext<SearchPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org w/out params.');
  const { data } = await supabase.from<Org>('orgs').select().eq('id', ctx.params.org);
  if (!data || !data[0]) return { notFound: true };
  const { props } = await getPageProps();
  return {
    props: { org: Org.parse(data[0]).toJSON(), ...props },
    revalidate: 1,
  };
};

export const getStaticPaths: GetStaticPaths<SearchPageQuery> = async () => {
  const { data } = await supabase.from<Org>('orgs').select();
  const paths = (data || []).map((org) => ({ params: { org: org.id } }));
  return { paths, fallback: true };
};

export default withI18n(SearchPage, { common, search, query3rd, match3rd });
