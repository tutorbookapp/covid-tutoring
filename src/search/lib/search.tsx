import React from 'react';

import { useUser } from '@tutorbook/firebase';
import { useIntl, defMsg, IntlShape, Msg } from '@tutorbook/intl';
import {
  Appt,
  AttendeeInterface,
  Timeslot,
  User,
  Query,
} from '@tutorbook/model';

import UserDialog from '@tutorbook/user-dialog';
import Utils from '@tutorbook/utils';
import QueryForm from '@tutorbook/query-form';
import Title from '@tutorbook/title';
import Result from './result';

import styles from './search.module.scss';

interface SearchProps {
  readonly onChange: (query: Query) => any;
  readonly results: ReadonlyArray<User>;
  readonly searching: boolean;
  readonly query: Query;
}

const msgs: Record<string, Msg> = defMsg({
  mentoring: {
    id: 'search.mentoring.title',
    defaultMessage: 'Expert mentors',
  },
  tutoring: {
    id: 'search.tutoring.title',
    defaultMessage: 'Volunteer tutors',
  },
});

function NoResults({
  header,
  body,
}: {
  header: string;
  body?: string;
}): JSX.Element {
  return (
    <div className={styles.noResults}>
      <h3 className={styles.noResultsHeader}>{header}</h3>
      {body && <p className={styles.noResultsBody}>{body}</p>}
    </div>
  );
}

export default function Search({
  query,
  results,
  searching,
  onChange,
}: SearchProps): JSX.Element {
  const intl: IntlShape = useIntl();
  const user = useUser();
  const [viewing, setViewing] = React.useState<User | undefined>();
  const getAppt: () => Appt = () => {
    if (!viewing) return new Appt();

    const attendees: AttendeeInterface[] = [
      {
        uid: viewing.uid,
        roles: ['tutor'],
      },
      {
        uid: user.uid,
        roles: ['tutee'],
      },
    ];
    const subjects: string[] = Utils.intersection<string>(
      query.subjects,
      viewing[query.aspect].subjects
    );
    const times: Timeslot[] = Utils.intersection<Timeslot>(
      query.availability,
      viewing.availability,
      (a: Timeslot, b: Timeslot) => a.equalTo(b)
    );

    return new Appt({ attendees, subjects, time: times[0] });
  };
  return (
    <div className={styles.wrapper}>
      {viewing && (
        <UserDialog
          user={viewing}
          appt={getAppt()}
          onClose={() => setViewing(undefined)}
        />
      )}
      <div className={styles.title}>
        <Title>{intl.formatMessage(msgs[query.aspect])}</Title>
      </div>
      <div className={styles.form}>
        <QueryForm query={query} onChange={onChange} />
      </div>
      {!searching && !!results.length && (
        <ul className={styles.results}>
          {results.map((res: User, index: number) => (
            <Result user={res} key={index} onClick={() => setViewing(res)} />
          ))}
        </ul>
      )}
      {searching && <NoResults header='Searching...' />}
      {!searching && !results.length && (
        <NoResults
          header='No Results'
          body='Try adding more availability or subjects.'
        />
      )}
    </div>
  );
}
