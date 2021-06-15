import { APIError } from 'lib/api/error';
import { Meeting } from 'lib/model/meeting';
import supabase from 'lib/api/supabase';

export default async function createMeetingDoc(
  meeting: Meeting
): Promise<Meeting> {
  const { data, error } = await supabase.from('meetings').insert(meeting);
  if (error) {
    const msg = `Error saving meeting (${meeting.toString()}) to database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
  return new Meeting(data);
}
