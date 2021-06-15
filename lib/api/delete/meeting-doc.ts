import { APIError } from 'lib/api/error';
import supabase from 'lib/api/supabase';

export default async function deleteMeetingDoc(
  meetingId: string
): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
  if (error) {
    const msg = `Error deleting meeting (${meetingId}) from database`;
    throw new APIError(`${msg}: ${error.message}`, 500);
  }
}
