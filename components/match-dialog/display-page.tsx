import { Chip, ChipSet } from '@rmwc/chip';
import Trans from 'next-translate/Trans';
import { format } from 'timeago.js';
import { useCallback } from 'react';
import useSWR from 'swr';
import useTranslation from 'next-translate/useTranslation';

import Avatar from 'components/avatar';

import { Callback, MatchJSON, MeetingJSON, Person, Timeslot } from 'lib/model';
import { join, period } from 'lib/utils';
import { onlyFirstNameAndLastInitial } from 'lib/api/get/truncated-user';

import styles from './display-page.module.scss';

interface EventProps {
  badge: string;
  time: Date;
  person: Person;
  children: React.ReactNode;
  viewPerson: (person: Person) => void;
}

function Event({
  badge,
  time,
  person,
  viewPerson,
  children,
}: EventProps): JSX.Element {
  const { lang: locale } = useTranslation();

  return (
    <div className={styles.event}>
      <div className={styles.badge}>
        <span className='material-icons'>{badge}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.time}>{format(time, locale)}</div>
        <div className={styles.body}>
          <a onClick={() => viewPerson(person)}>{`${person.name} `}</a>
          {children}
        </div>
      </div>
    </div>
  );
}

function Endpoint(): JSX.Element {
  return (
    <div className={styles.origin}>
      <div className={styles.badge} />
    </div>
  );
}

export interface DisplayPageProps {
  match: MatchJSON;
  people: Person[];
  setActive: Callback<number>;
}

export default function DisplayPage({
  match,
  people,
  setActive,
}: DisplayPageProps): JSX.Element {
  const { data: meetings } = useSWR<MeetingJSON[]>(
    `/api/matches/${match.id}/meetings`
  );
  const { t } = useTranslation();

  const viewPerson = useCallback(
    (person: Person) => {
      return setActive(people.findIndex((p) => p.id === person.id) + 3);
    },
    [setActive, people]
  );

  return (
    <>
      <div className={styles.content}>
        <div className={styles.display}>
          <div className={styles.header}>People</div>
          <div className={styles.people}>
            {people.map((person, idx) => (
              <a onClick={() => setActive(idx + 3)} className={styles.person}>
                <div className={styles.avatar}>
                  <Avatar src={person.photo} size={129} />
                </div>
                <div className={styles.name}>
                  {`${onlyFirstNameAndLastInitial(person.name || '')} (${
                    join(person.roles) || 'creator'
                  })`}
                </div>
              </a>
            ))}
          </div>
          <div className={styles.header}>Subjects</div>
          <div className={styles.body}>{join(match.subjects)}</div>
          <div className={styles.header}>Next meeting time</div>
          <div className={styles.body}>
            {match.time
              ? Timeslot.fromJSON(match.time).toString()
              : 'No scheduled meetings'}
          </div>
          <div className={styles.header}>Meeting venue</div>
          <a href={match.venue.url} className={styles.body}>
            {match.venue.url}
          </a>
        </div>
        <div className={styles.timeline}>
          <Endpoint />
          <Event
            badge='add_box'
            time={new Date(match.venue.created)}
            person={match.creator}
            viewPerson={viewPerson}
          >
            {t('matches:event-created')}
          </Event>
          <Event
            badge='email'
            time={new Date(match.venue.created)}
            person={match.creator}
            viewPerson={viewPerson}
          >
            <Trans
              i18nKey='matches:event-message'
              components={[<br />]}
              values={{ message: period(match.message) }}
            />
          </Event>
          {(meetings || []).map((meeting: MeetingJSON) => (
            <Event
              badge='event_note'
              time={new Date(meeting.created)}
              person={meeting.creator}
              viewPerson={viewPerson}
            >
              <Trans
                i18nKey='matches:event-meeting'
                components={[<br />]}
                values={{ time: Timeslot.fromJSON(meeting.time).toString() }}
              />
            </Event>
          ))}
          <Endpoint />
        </div>
      </div>
      <div className={styles.actions}>
        <ChipSet className={styles.chips}>
          <Chip
            icon='event_note'
            label='Log meeting'
            onClick={() => setActive(2)}
          />
          <Chip icon='edit' label='Edit match' onClick={() => setActive(1)} />
        </ChipSet>
      </div>
    </>
  );
}
