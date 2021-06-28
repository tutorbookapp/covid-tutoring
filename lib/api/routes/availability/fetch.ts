import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { AvailabilityJSON } from 'lib/model/availability';
import { handle } from 'lib/api/error';
import getAvailability from 'lib/api/get/availability';
import verifyAvailabilityQuery from 'lib/api/verify/availability-query';
import verifyQueryId from 'lib/api/verify/query-id';

export type FetchAvailabilityRes = AvailabilityJSON;

/**
 * Fetches a given user's availability (an array of 30 min timeslots in 15 min
 * increments for the requested time range).
 */
export default async function fetchAvailability(
  req: Req,
  res: Res<FetchAvailabilityRes>
): Promise<void> {
  try {
    const id = verifyQueryId(req.query);
    const { month, year } = verifyAvailabilityQuery(req.query);
    const availability = await getAvailability(id, month, year);
    res.status(200).json(availability);
  } catch (e) {
    handle(e, res);
  }
}
