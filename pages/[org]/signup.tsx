import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import { AspectHeader, EmptyHeader } from 'components/navigation';
import Page from 'components/page';
import Signup from 'components/signup';

import { Aspect, isAspect } from 'lib/model/aspect';
import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { OrgContext } from 'lib/context/org';
import supabase from 'lib/api/supabase';
import usePage from 'lib/hooks/page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import signup from 'locales/en/signup.json';
import user3rd from 'locales/en/user3rd.json';

interface SignupPageProps extends PageProps {
  org?: OrgJSON;
}

function SignupPage({ org, ...props }: SignupPageProps): JSX.Element {
  const { query } = useRouter();
  const { lang: locale } = useTranslation();
  const [aspect, setAspect] = useState<Aspect>(() => {
    if (!org) return 'mentoring';
    return org.aspects[0] || 'mentoring';
  });

  usePage({ name: 'Org Signup', org: org?.id });
  useEffect(() => {
    setAspect((prev: Aspect) => {
      const updated = isAspect(query.aspect) ? query.aspect : prev;
      if (org && !org.aspects.includes(updated)) return prev;
      return updated;
    });
  }, [org, query]);

  return (
    <OrgContext.Provider value={{ org: org ? Org.parse(org) : undefined }}>
      <Page
        title={`${org?.name || 'Loading'} - Signup - Tutorbook`}
        description={org ? org.signup[locale][aspect]?.body : undefined}
        formWidth
        {...props}
      >
        {(!org || org.aspects.length === 2) && (
          <AspectHeader aspect={aspect} onChange={setAspect} formWidth />
        )}
        {!!org && org.aspects.length !== 2 && <EmptyHeader formWidth />}
        <Signup aspect={aspect} />
      </Page>
    </OrgContext.Provider>
  );
}

interface SignupPageQuery extends ParsedUrlQuery {
  org: string;
}

export const getStaticProps: GetStaticProps<
  SignupPageProps,
  SignupPageQuery
> = async (ctx: GetStaticPropsContext<SignupPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org w/out params.');
  const { data } = await supabase.from<Org>('orgs').select().eq('id', ctx.params.org);
  if (!data || !data[0]) return { notFound: true };
  const org = Org.parse(data[0]);
  const { props } = await getPageProps();
  return { props: { org: org, ...props }, revalidate: 1 };
};

export const getStaticPaths: GetStaticPaths<SignupPageQuery> = async () => {
  const { data } = await supabase.from<Org>('orgs').select();
  const paths = (data || []).map((org) => ({ params: { org: org.id } }));
  return { paths, fallback: true };
};

export default withI18n(SignupPage, { common, signup, user3rd });
