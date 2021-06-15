import { CSSProperties, createContext, useContext } from 'react';
import { RRule } from 'rrule';

import { caps, getEmailLink, getPhoneLink, join } from 'lib/utils';
import { Meeting } from 'lib/model';
import { Org } from 'lib/model';
import { Role } from 'lib/model';
import { User } from 'lib/model';

const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  '"Roboto"',
  '"Oxygen"',
  '"Ubuntu"',
  '"Cantarell"',
  '"Fira Sans"',
  '"Droid Sans"',
  '"Helvetica Neue"',
  'sans-serif',
].join(',');
const colors = {
  background: '#ffffff',
  onBackground: '#000000',
  accents1: '#fafafa',
  accents2: '#eaeaea',
  accents3: '#999999',
  accents4: '#888888',
  accents5: '#666666',
  accents6: '#444444',
};
const borderColor = '#dddddd';
const borderRadius = '8px';

const textStyle = {
  fontFamily,
  fontSize: '18px',
  lineHeight: '28px',
  color: colors.onBackground,
};

const quoteStyle = {
  margin: '0',
  color: '#474747',
  borderLeft: '4px solid #a6a6a6',
  padding: '0 0 0 24px',
  display: 'block',
  quotes: 'none',
};

const linkStyle = {
  ...textStyle,
  textDecoration: 'none',
  color: '#067df7 !important',
};

const buttonStyle = {
  fontFamily,
  borderRadius,
  color: '#ffffff !important',
  lineHeight: '56px',
  fontSize: '16px',
  textDecoration: 'none',
  backgroundColor: '#000000',
  display: 'inline-block',
  fontWeight: 600,
  width: '200px',
};

const dividerStyle = {
  border: 'none',
  borderTop: `1px solid ${borderColor}`,
  marginBottom: '26px',
  width: '100%',
};

const tableStyle = {
  borderCollapse: 'collapse' as CSSProperties['borderCollapse'],
  borderSpacing: '0',
  tableLayout: 'fixed' as CSSProperties['tableLayout'],
  width: '100%',
};

const rowStyle = {
  padding: '0px !important',
  margin: '0px !important',
};

const ColorContext = createContext<string>(colors.onBackground);
const useColor = () => useContext<string>(ColorContext);

interface Props {
  children: React.ReactNode;
  style?: CSSProperties;
}

export function P({ style, children }: Props): JSX.Element {
  const color = useColor();
  return <p style={{ ...textStyle, ...style, color }}>{children}</p>;
}

export function I({ style, children }: Props): JSX.Element {
  const color = useColor();
  return <i style={{ ...textStyle, ...style, color }}>{children}</i>;
}

export function Cite({ style, children }: Props): JSX.Element {
  const color = useColor();
  return <cite style={{ ...textStyle, ...style, color }}>{children}</cite>;
}

type QuoteProps = { text: string; cite: string; style?: CSSProperties };

export function Quote({ text, cite, style }: QuoteProps): JSX.Element {
  return (
    <ColorContext.Provider value={quoteStyle.color}>
      <blockquote style={{ ...quoteStyle, ...style }}>
        <P style={{ marginTop: '0px' }}>
          <I>&quot;{text}&quot;</I>
        </P>
        <Cite>—{cite}</Cite>
      </blockquote>
    </ColorContext.Provider>
  );
}

type HrefProps = { href: string } & Props;

export function Link({ href, style, children }: HrefProps): JSX.Element {
  return (
    <a href={href} style={{ ...linkStyle, ...style }}>
      {children}
    </a>
  );
}

export function Button({ href, style, children }: HrefProps): JSX.Element {
  return (
    <table width='100%'>
      <tbody>
        <tr>
          <td align='center' style={{ padding: '0' }}>
            <div>
              <a
                href={href}
                style={{ ...buttonStyle, ...style, textAlign: 'center' }}
              >
                {children}
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface MeetingDisplayProps {
  show?: 'message' | 'description';
  timeZone: string;
  meeting: Meeting;
  people: User[];
  sender: User;
  org?: Org;
}

export function MeetingDisplay({
  show = 'message',
  timeZone,
  meeting,
  people,
  sender,
  org,
}: MeetingDisplayProps): JSX.Element {
  // TODO: Store the user's timezone in their profile and show the meeting time
  // in their local timezone when sending emails, text messages, etc.
  const rrule = new RRule({
    ...RRule.parseString(meeting.time.recur || ''),
    dtstart: meeting.time.from,
  });
  const noMessageOrDescription =
    (show === 'description' && !meeting.description) ||
    (show === 'message' && !meeting.match.message);

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius }}>
      <Item top='24px' bottom='24px' left='24px' right='24px'>
        <P style={{ marginTop: '0px', marginBottom: '8px' }}>
          <b>WHO</b>
        </P>
        {people.map((person) => (
          <Person key={person.id} {...person} org={meeting.match.org} />
        ))}
        <P>
          <b>WHEN</b>
          <br />
          {meeting.time.toString('en', timeZone)}
        </P>
        {meeting.time.recur && rrule.isFullyConvertibleToText() && (
          <P>
            <b>RECURRING</b>
            <br />
            {caps(rrule.toText())}
          </P>
        )}
        <P>
          <b>WHERE</b>
          <br />
          <Link href={meeting.venue.url}>{meeting.venue.url}</Link>
        </P>
        <P style={{ marginBottom: noMessageOrDescription ? '0px' : undefined }}>
          <b>SUBJECTS</b>
          <br />
          {join(meeting.match.subjects)}
        </P>
        {show === 'description' && meeting.description && (
          <P style={{ marginBottom: '0px' }}>
            <b>DESCRIPTION</b>
            <br />
            {meeting.description}
          </P>
        )}
        {show === 'message' && meeting.match.message && (
          <>
            <P style={{ marginBottom: '8px' }}>
              <b>MESSAGE</b>
            </P>
            <Quote
              text={meeting.match.message}
              cite={org ? `${sender.name} from ${org.name}` : sender.name}
            />
          </>
        )}
      </Item>
    </div>
  );
}

interface ContactsTableProps {
  contacts: { name: string; email: string }[];
}

export function ContactsTable({ contacts }: ContactsTableProps): JSX.Element {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th
              role='columnheader'
              scope='col'
              style={{
                ...textStyle,
                fontWeight: 600,
                textAlign: 'left',
                padding: '24px 0 24px 24px',
              }}
            >
              Name
            </th>
            <th
              role='columnheader'
              scope='col'
              style={{
                ...textStyle,
                fontWeight: 600,
                textAlign: 'left',
                padding: '24px',
              }}
            >
              Email
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(({ name, email }) => (
            <tr key={email} style={{ borderTop: `1px solid ${borderColor}` }}>
              <td style={{ ...textStyle, padding: '24px 0 24px 24px' }}>
                {name}
              </td>
              <td style={{ ...textStyle, padding: '24px' }}>
                <Link href={getEmailLink({ name, email })}>{email}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ItemProps = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
} & Omit<Props, 'style'>;

export function Item({
  top,
  bottom,
  left,
  right,
  children,
}: ItemProps): JSX.Element {
  return (
    <table style={tableStyle} cellPadding='0'>
      <tbody>
        <tr style={rowStyle}>
          <td style={{ paddingLeft: left, paddingRight: right }}>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td
                    style={{ paddingTop: top, paddingBottom: bottom }}
                    align='left'
                  >
                    {children}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export interface UserDisplayProps {
  org?: Org;
  user: User;
  subjects: string[];
  langs: string[];
}

export function UserDisplay({
  org,
  user,
  subjects,
  langs,
}: UserDisplayProps): JSX.Element {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius }}>
      <Item top='24px' bottom='24px' left='24px' right='24px'>
        <Person {...user} org={org?.id} />
        <P>
          <b>ABOUT</b>
          <br />
          {user.bio}
        </P>
        {user.reference && (
          <P>
            <b>REFERENCE</b>
            <br />
            {user.reference}
          </P>
        )}
        <P>
          <b>TEACHES</b>
          <br />
          {join(subjects)}
        </P>
        <P style={{ marginBottom: '0px' }}>
          <b>SPEAKS</b>
          <br />
          {join(langs)}
        </P>
      </Item>
    </div>
  );
}

export interface PersonProps {
  name: string;
  photo: string;
  phone: string;
  email: string;
  roles: Role[];
  org?: string;
  id: string;
}

export function Person({
  name,
  photo,
  phone,
  email,
  roles,
  org,
  id,
}: PersonProps): JSX.Element {
  return (
    <table style={{ ...tableStyle, marginBottom: '18px' }} cellPadding='0'>
      <tbody>
        <tr style={rowStyle}>
          <td style={{ width: '112px', height: '100px' }}>
            <a
              style={{
                width: '100px',
                height: '100px',
                textDecoration: 'none',
                display: 'block !important',
              }}
              href={`https://tutorbook.org/${org || 'default'}/users/${id}`}
            >
              <img
                style={{
                  backgroundColor: colors.accents2,
                  borderRadius: '4px',
                }}
                src={photo || 'https://assets.tutorbook.org/pngs/profile.png'}
                width='100px'
                height='100px'
                alt=''
              />
            </a>
          </td>
          <td style={{ height: '100px' }}>
            <P
              style={{
                marginTop: '0px',
                marginBottom: '0px',
                maxHeight: '28px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {roles.length ? `${name} (${join(roles)})` : name}
            </P>
            <ColorContext.Provider value={linkStyle.color}>
              <P
                style={{
                  marginTop: '0px',
                  marginBottom: '0px',
                  maxHeight: '28px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Link href={getEmailLink({ name, email })}>{email}</Link>
              </P>
              <P
                style={{
                  marginTop: '0px',
                  marginBottom: '0px',
                  maxHeight: '28px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Link href={getPhoneLink({ name, phone })}>{phone}</Link>
              </P>
            </ColorContext.Provider>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Header(): JSX.Element {
  return (
    <Item top='48px' bottom='48px' left='48px' right='48px'>
      <a
        style={{
          ...linkStyle,
          width: '64px',
          height: '64px',
          display: 'block !important',
        }}
        href='https://tutorbook.org'
        aria-label='Tutorbook'
      >
        <img
          style={{ backgroundColor: colors.accents2, borderRadius: '4px' }}
          alt=''
          src='https://tutorbook.org/favicon/favicon-96x96.png'
          width='64px'
          height='64px'
        />
      </a>
    </Item>
  );
}

export function Footer({ children }: Partial<Props>): JSX.Element {
  return (
    <ColorContext.Provider value='#666666'>
      <Item top='48px' bottom='48px' left='48px' right='48px'>
        <hr style={dividerStyle} />
        <P>
          Tutorbook - <Link href='https://tutorbook.org'>tutorbook.org</Link>
        </P>
        {children}
      </Item>
    </ColorContext.Provider>
  );
}

export function Email({ children }: Props): JSX.Element {
  return (
    <div>
      <table
        style={{
          ...tableStyle,
          display: 'table',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: '580px',
          padding: 0,
          verticalAlign: 'top',
        }}
      >
        <tbody>
          <tr style={rowStyle}>
            <td>
              <div
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${borderColor}`,
                  overflow: 'hidden',
                }}
              >
                {children}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
