import { getTimeslot } from 'components/availability-select/utils';

import { Meeting } from 'lib/model/meeting';
import { Position } from 'lib/model/position';

export function getMeeting(
  height: number,
  position: Position,
  meeting: Meeting,
  width: number,
  reference: Date = new Date(0)
): Meeting {
  const time = getTimeslot(height, position, meeting.time, width, reference);
  return Meeting.parse({ ...meeting, time });
}

export { getHeight, getPosition } from 'components/availability-select/utils';
