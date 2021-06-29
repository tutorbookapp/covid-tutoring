import { APIError } from 'lib/api/error';
import { Org } from 'lib/model/org';
import supabase from 'lib/api/supabase';

export default async function updateOrgDoc(org: Org): Promise<Org> {
  const { error } = await supabase.from('orgs').update(org).eq('id', org.id);
  if (error) {
    const msg = `Error updating org (${org.toString()}) in database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
  return org;
}
