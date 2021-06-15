import { APIError } from 'lib/api/error';
import { Meeting } from 'lib/model/meeting';
import supabase from 'lib/api/supabase';

export default async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await supabase.from<Meeting>('meetings').select().eq('id', id);
  if (!data || !data[0])
    throw new APIError(`Meeting (${id}) does not exist in database`);
  return new Meeting(data[0]);
}
