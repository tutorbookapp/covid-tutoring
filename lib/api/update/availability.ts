import to from 'await-to-js';

import { client, prefix } from 'lib/api/algolia';
import { APIError } from 'lib/api/error';
import { Availability } from 'lib/model/availability';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { User } from 'lib/model/user';
import { getAlgoliaAvailability } from 'lib/utils/time';
import getMeetings from 'lib/api/get/meetings';

/**
 * Updates the user's availability as indexed on Algolia.
 * @param user - The user whose availability we want to update.
 * @todo Should we switch from 3 months (determined by our `TimeSelect` default
 * booking threshold) to something smaller like 2-3 weeks?
 * @todo Ideally, volunteers should be able to specify their booking period
 * (e.g. "Allow bookings 3 weeks in advance").
 */
export default async function updateAvailability(user: User): Promise<void> {
  const query = MeetingsQuery.parse({
    people: [{ label: user.name, value: user.id }],
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 3),
    from: new Date(),
  });
  const meetings = (await getMeetings(query)).results;
  const booked = Availability.parse(meetings.map((m) => m.time));

  const availability = getAlgoliaAvailability(
    user.availability,
    booked,
    query.to
  );
  const idx = client.initIndex(`${prefix}-users`);

  const [err] = await to(
    idx.partialUpdateObject({
      _availability: availability,
      objectID: user.id,
    })
  );
  if (err) {
    const msg = `${err.name} updating ${user.toString()} availability`;
    throw new APIError(`${msg}: ${err.message}`, 500);
  }
}
