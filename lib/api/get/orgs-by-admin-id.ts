import { Org } from 'lib/model/org';
import supabase from 'lib/api/supabase';

export default async function getOrgsByAdminId(uid: string): Promise<Org[]> {
  const { data } = await supabase.from('relation_members').select('org:(*)').eq('user', uid); 
  return (data || []).map((d) => new Org(d));
}
