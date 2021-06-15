import {
  Button,
  Email,
  Footer,
  Header,
  Item,
  Link,
  MeetingDisplay,
  P,
} from 'lib/mail/components';
import { Meeting } from 'lib/model';
import { User } from 'lib/model';
import { getEmailLink, getPhoneLink } from 'lib/utils';

export interface DirectMeetingEmailProps {
  meeting: Meeting;
  recipient: User;
  creator: User;
  people: User[];
}

export default function DirectMeetingEmail({
  meeting,
  recipient,
  creator,
  people,
}: DirectMeetingEmailProps): JSX.Element {
  const calendarURL = 'https://tutorbook.org/calendar';
  const isTutoring = recipient.roles.includes('tutor');

  return (
    <Email>
      <Header />
      <Item left='48px' right='48px'>
        <P style={{ marginTop: '0px !important' }}>Hi {recipient.firstName},</P>
        <P>
          {creator.name} scheduled a new{' '}
          {isTutoring ? 'tutoring lesson' : 'meeting'} with you:
        </P>
        <MeetingDisplay
          show='message'
          timeZone={recipient.timezone}
          meeting={meeting}
          people={people.filter((p) => p.id !== recipient.id)}
          sender={creator}
        />
        <br />
        <P>
          To view and edit your {isTutoring ? 'lessons' : 'meetings'}, simply
          click the button below:
        </P>
        <br />
        <Button href={calendarURL}>VIEW CALENDAR</Button>
        <br />
        <P>Or copy and paste this URL into a new tab of your browser:</P>
        <P style={{ marginBottom: '0px !important' }}>
          <Link href={calendarURL}>{calendarURL}</Link>
        </P>
        <br />
        <P>
          If you&apos;re unable to attend or if this doesn&apos;t seem like a
          good match, please get in touch with {creator.firstName} by replying
          to this email or by using the following contact info:
        </P>
        <P>
          <Link href={getEmailLink(creator)}>{creator.email}</Link>
          <br />
          <Link href={getPhoneLink(creator)}>{creator.phone}</Link>
        </P>
        <br />
        <P style={{ marginBottom: '0px !important' }}>Thank you.</P>
      </Item>
      <Footer>
        <P>
          This email was sent to you because you have a profile on Tutorbook.
          You can edit or remove your profile{' '}
          <Link href='https://tutorbook.org/profile'>here</Link>.
        </P>
        <P style={{ marginBottom: '0px !important' }}>
          If this message contains spam or unwanted messages let us know at{' '}
          <Link href='mailto:team@tutorbook.org'>team@tutorbook.org</Link>.
        </P>
      </Footer>
    </Email>
  );
}
