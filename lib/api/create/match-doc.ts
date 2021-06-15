import { APIError } from 'lib/api/error';
import { Match } from 'lib/model/match';
import supabase from 'lib/api/supabase';

export default async function createMatchDoc(match: Match): Promise<Match> {
  const { data, error } = await supabase.from('matches').insert(match);
  if (error) {
    const msg = `Error saving match (${match.toString()}) to database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
  return Match.parse(data);
}
