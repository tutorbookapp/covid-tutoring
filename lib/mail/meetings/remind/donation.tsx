import { renderToStaticMarkup } from 'react-dom/server';

import { Meeting } from 'lib/model/meeting';
import { User } from 'lib/model/user';
import send from 'lib/mail/send';

import ReminderTemplate from './donation-template';

export default async function sendDonationReminderEmails(
  meeting: Meeting,
  people: User[]
): Promise<void> {
  return send({
    to: people.map((p) => ({ name: p.name, email: p.email })),
    subject: 'Thank you for your continuous support!',
    html: renderToStaticMarkup(
      <ReminderTemplate meeting={meeting} people={people} />
    ),
  });
}
