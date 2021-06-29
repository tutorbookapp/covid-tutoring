import { APIError } from 'lib/api/error';
import supabase from 'lib/api/supabase';

export default async function deleteMatchDoc(matchId: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) {
    const msg = `Error deleting match (${matchId}) from database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
}
