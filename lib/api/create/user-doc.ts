import { APIError } from 'lib/api/error';
import { User } from 'lib/model/user';
import supabase from 'lib/api/supabase';

export default async function createUserDoc(user: User): Promise<User> {
  const { data, error } = await supabase.from('users').insert(user);
  if (error) {
    const msg = `Error saving user (${user.toString()}) in database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
  return new User(data);
}
