import { APIError } from 'lib/api/error';
import supabase from 'lib/api/supabase';

export default async function verifyDocExists<T extends { id: string }>(table: string, id: string): Promise<T> {
  const { data } = await supabase.from<T>(table).select().eq('id', id);
  if (!data || !data[0]) {
    const msg = `Document (${table}/${id}) does not exist in database`;
    throw new APIError(msg, 400);
  }
  return data[0];
}
