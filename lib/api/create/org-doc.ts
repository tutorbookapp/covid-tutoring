import { APIError } from 'lib/api/error';
import { Org } from 'lib/model/org';
import supabase from 'lib/api/supabase';

export default async function createOrgDoc(org: Org): Promise<Org> {
  const { data, error } = await supabase.from('orgs').insert(org);
  if (error) {
    const msg = `Error saving org (${org.toString()}) in database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
  return new Org(data);
}
