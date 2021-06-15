import { APIError } from 'lib/api/error';
import { User } from 'lib/model/user';
import supabase from 'lib/api/supabase';

export default async function getUser(uid: string): Promise<User> {
  const { data } = await supabase.from('users').select().eq('id', uid);
  if (!data || !data[0]) throw new APIError(`User (${uid}) does not exist`, 400);
  return User.parse(data[0]);
}
