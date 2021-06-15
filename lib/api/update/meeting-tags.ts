import { Meeting, MeetingTag } from 'lib/model/meeting';
import clone from 'lib/utils/clone';

export default function updateMeetingTags(meeting: Meeting): Meeting {
  const tags: MeetingTag[] = [];
  if (meeting.time.recur) tags.push('recurring');
  return Meeting.parse(clone({ ...meeting, tags }));
}
