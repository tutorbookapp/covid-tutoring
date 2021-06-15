import { APIError } from 'lib/api/error';
import { Match } from 'lib/model/match';
import supabase from 'lib/api/supabase';

export default async function getMatch(id: string): Promise<Match> {
  const { data } = await supabase.from<Match>('matches').select().eq('id', id);
  if (!data || !data[0])
    throw new APIError(`Match (${id}) does not exist in database`);
  return new Match(data[0]);
}
