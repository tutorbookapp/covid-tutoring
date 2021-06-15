import { renderToStaticMarkup } from 'react-dom/server';

import { Meeting } from 'lib/model/meeting';
import { Org } from 'lib/model/org';
import { User } from 'lib/model/user';
import { Email } from 'lib/mail/types';
import { join } from 'lib/utils';
import send from 'lib/mail/send';

import DirectMeetingTemplate from './direct-template';
import MeetingTemplate from './template';
import OrgDirectMeetingTemplate from './org-direct-template';
import OrgMeetingTemplate from './org-template';

export default async function sendEmails(
  meeting: Meeting,
  people: User[],
  creator: User,
  org: Org,
  orgAdmins: User[]
): Promise<void> {
  const emails: Email[] = [];
  const isTutoring = people.some((p) => p.roles.includes('tutor'));
  const noun = isTutoring ? 'tutoring lesson' : 'meeting';
  if (people.findIndex((p) => p.id === creator.id) < 0) {
    // Admin created meeting, send admin meeting email to all meeting people.
    emails.push({
      replyTo: { name: creator.name, email: creator.email },
      to: people.map((p) => ({ name: p.name, email: p.email })),
      subject: `New ${join(meeting.match.subjects)} ${noun} on Tutorbook.`,
      html: renderToStaticMarkup(
        <MeetingTemplate
          meeting={meeting}
          people={people}
          creator={creator}
          org={org}
        />
      ),
    });
    emails.push({
      to: orgAdmins.map((p) => ({ name: p.name, email: p.email })),
      subject: `New ${join(meeting.match.subjects)} ${noun} on Tutorbook.`,
      html: renderToStaticMarkup(
        <OrgMeetingTemplate
          meeting={meeting}
          people={people}
          creator={creator}
          org={org}
        />
      ),
    });
  } else {
    // Student or parent created meeting, send request email to volunteer.
    const recipient = people[people.findIndex((p) => p.id !== creator.id)];
    emails.push({
      replyTo: { name: creator.name, email: creator.email },
      to: [{ name: recipient.name, email: recipient.email }],
      subject: `New ${join(meeting.match.subjects)} ${noun} on Tutorbook.`,
      html: renderToStaticMarkup(
        <DirectMeetingTemplate
          meeting={meeting}
          recipient={recipient}
          creator={creator}
          people={people}
        />
      ),
    });
    emails.push({
      to: orgAdmins.map((p) => ({ name: p.name, email: p.email })),
      subject: `New ${join(meeting.match.subjects)} ${noun} on Tutorbook.`,
      html: renderToStaticMarkup(
        <OrgDirectMeetingTemplate
          meeting={meeting}
          recipient={recipient}
          creator={creator}
          people={people}
          org={org}
        />
      ),
    });
  }
  await Promise.all(emails.map((email) => send(email)));
}
