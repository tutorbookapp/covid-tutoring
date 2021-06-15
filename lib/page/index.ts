import { GetStaticPathsResult } from 'next';

import { Org, OrgJSON } from 'lib/model/org';
import supabase from 'lib/api/supabase';

// Orgs must be optional because they are undefined when Next.js renders the
// fallback page during build-time. They are updated afterwards.
// See: https://nextjs.org/docs/basic-features/data-fetching#fallback-true
// See: https://github.com/vercel/next.js/issues/14200
// See: https://github.com/vercel/next.js/issues/22507
export interface PageProps {
  orgs?: OrgJSON[];
}

export async function getPageProps(): Promise<{ props: PageProps }> {
  const { data } = await supabase.from('orgs').select();
  const orgs = (data || []).map((d) => Org.parse(d).toJSON());
  return { props: { orgs } };
}

export async function getPagePaths(): Promise<GetStaticPathsResult> {
  return { paths: [], fallback: true };
}
