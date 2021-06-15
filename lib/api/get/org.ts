import { APIError } from 'lib/api/error';
import { Org } from 'lib/model/org';
import supabase from 'lib/api/supabase';

export default async function getOrg(id: string): Promise<Org> {
  const { data } = await supabase.from<Org>('orgs').select().eq('id', id);
  if (!data || !data[0]) throw new APIError(`Org (${id}) does not exist in database`);
  return Org.parse(data[0]);
}
