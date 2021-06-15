import { APIError } from 'lib/api/error';
import { Match } from 'lib/model/match';
import supabase from 'lib/api/supabase';

/**
 * Updates the Firestore database document for the given match.
 * @param match - The match to update a document for.
 * @return Promise that resolves to nothing; throws an `APIError` if we were
 * unable to update the Firestore document.
 * @todo This won't error if the given document doesn't exist; we must use the
 * `DocumentReference#set` method in order to remove data. Should we error?
 */
export default async function updateMatchDoc(match: Match): Promise<void> {
  const { error } = await supabase.from('matches').update(match).eq('id', match.id);
  if (error) {
    const msg = `Error updating match (${match.toString()}) in database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
}
