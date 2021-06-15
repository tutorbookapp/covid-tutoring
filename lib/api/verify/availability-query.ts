import { isJSON, isNumberJSON } from 'lib/model/json';
import { APIError } from 'lib/api/error';

interface AvailabilityQuery {
  month: number;
  year: number;
}

type AvailabilityQueryURL = { [key in keyof AvailabilityQuery]: string };

function isAvailabilityQueryURL(query: unknown): query is AvailabilityQueryURL {
  if (!isJSON(query)) return false;
  if (!isNumberJSON(query.month)) return false;
  if (!isNumberJSON(query.year)) return false;
  return true;
}

export default function verifyAvailabilityQuery(
  query: unknown
): AvailabilityQuery {
  if (isAvailabilityQueryURL(query))
    return {
      month: Number(query.month),
      year: Number(query.year),
    };
  throw new APIError('Invalid availability query', 400);
}
