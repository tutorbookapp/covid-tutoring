import { Meeting } from 'lib/model';
import { Org } from 'lib/model';
import { Role } from 'lib/model';
import { User } from 'lib/model';
import { Venue } from 'lib/model';

/**
 * Get the meeting venue:
 * 0. The meeting's existing venue (if it isn't a Jitsi link).
 * 1. Use the org's meeting link (if it exists).
 * 2. Use the tutor's or mentor's meeting link (if it exists).
 * 3. Use the parent's meeting link (if it exists).
 * 4. Use the tutee's or mentee's meeting link (if it exists).
 * 5. Fallback to using an automatically generated Jitsi link.
 */
export default function getMeetingVenue(
  meeting: Meeting,
  org: Org,
  people: User[]
): Venue {
  if (!meeting.venue.url.includes('meet.jit.si')) return meeting.venue;
  if (org.venue) return new Venue({ url: org.venue });

  const priority: Role[] = ['tutor', 'mentor', 'parent', 'tutee', 'mentee'];
  // eslint-disable-next-line no-restricted-syntax
  for (const role of priority) {
    const person = people.find((p) => p.roles.includes(role) && p.venue);
    if (person?.venue) return new Venue({ url: person.venue });
  }

  return meeting.venue;
}
