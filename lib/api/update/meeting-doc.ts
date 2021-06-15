import { APIError } from 'lib/api/error';
import { Meeting } from 'lib/model/meeting';
import supabase from 'lib/api/supabase';

export default async function updateMeetingDoc(
  meeting: Meeting
): Promise<void> {
  const { error } = await supabase.from('meetings').update(meeting).eq('id', meeting.id);
  if (error) {
    const m = `Error updating meeting (${meeting.toString()}) in database`;
    throw new APIError(`${m}: ${error.message}`, 500);
  }
}
