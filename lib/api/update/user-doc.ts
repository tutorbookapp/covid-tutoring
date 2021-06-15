import { APIError } from 'lib/api/error';
import { User } from 'lib/model/user';
import supabase from 'lib/api/supabase';

export default async function updateUserDoc(user: User): Promise<void> {
  const { error } = await supabase.from('users').update(user).eq('id', user.id);
  if (error) {
    const msg = `Error updating user (${user.toString()}) in database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
}
