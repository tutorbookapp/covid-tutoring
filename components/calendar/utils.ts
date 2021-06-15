import { getTimeslot } from 'components/availability-select/utils';

import { Meeting } from 'lib/model';
import { Position } from 'lib/model';

export function getMeeting(
  height: number,
  position: Position,
  meeting: Meeting,
  width: number,
  reference: Date = new Date(0)
): Meeting {
  const time = getTimeslot(height, position, meeting.time, width, reference);
  return new Meeting({ ...meeting, time });
}

export { getHeight, getPosition } from 'components/availability-select/utils';
