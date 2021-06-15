import { Meeting } from 'lib/model/meeting';
import supabase from 'lib/api/supabase';

export default async function getMatchMeetings(
  matchId: string
): Promise<Meeting[]> {
  const { data } = await supabase.from<Meeting>('meetings').eq('match', matchId);
  return (data || []).map((d) => new Meeting(d));
}
