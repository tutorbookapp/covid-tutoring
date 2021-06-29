import { APIError } from 'lib/api/error';
import supabase from 'lib/api/supabase';

export default async function deleteUserDoc(uid: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', uid);
  if (error) {
    const msg = `Error deleting user (${uid}) from database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
}
