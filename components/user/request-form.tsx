import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { TextField } from '@rmwc/textfield';
import to from 'await-to-js';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import SubjectSelect, { SubjectOption } from 'components/subject-select';
import UserSelect, { UserOption } from 'components/user-select';
import Button from 'components/button';
import Loader from 'components/loader';
import TimeSelect from 'components/time-select';

import { Aspect, isAspect } from 'lib/model/aspect';
import { Meeting, MeetingJSON } from 'lib/model/meeting';
import { User, UserJSON } from 'lib/model/user';
import { join, period } from 'lib/utils';
import { APIErrorJSON } from 'lib/api/error';
import { Match } from 'lib/model/match';
import { Person } from 'lib/model/person';
import { Timeslot } from 'lib/model/timeslot';
import { getErrorMessage } from 'lib/fetch';
import { signupWithGoogle } from 'lib/firebase/signup';
import useAnalytics from 'lib/hooks/analytics';
import { useOrg } from 'lib/context/org';
import useTrack from 'lib/hooks/track';
import { useUser } from 'lib/context/user';

import styles from './request-form.module.scss';

export interface RequestFormProps {
  user: User;
  admin: boolean;
}

export default function RequestForm({
  user,
  admin,
}: RequestFormProps): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  const { t } = useTranslation();

  const { org } = useOrg();
  const { query } = useRouter();
  const { user: currentUser, updateUser } = useUser();

  const [students, setStudents] = useState<UserOption[]>([
    { label: 'Me', value: '' },
  ]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [message, setMessage] = useState<string>('');
  const [time, setTime] = useState<Timeslot>();

  // TODO: Sync this somehow with the global user state. When we log out, these
  // should become empty once again.
  const [reference, setReference] = useState<string>(currentUser.reference);
  const [phone, setPhone] = useState<string>(currentUser.phone);

  useEffect(() => {
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.label === 'Me');
      if (idx < 0) return prev;
      const me = {
        label: 'Me',
        value: currentUser.id,
        photo: currentUser.photo,
      };
      return [...prev.slice(0, idx), me, ...prev.slice(idx + 1)];
    });
  }, [currentUser]);

  const aspects = useMemo(() => {
    if (org?.aspects.length === 1) return org.aspects;
    const asps = new Set<Aspect>();
    if (isAspect(query.aspect)) asps.add(query.aspect);
    subjects.forEach((s) => s.aspect && asps.add(s.aspect));
    return [...asps].filter((a) => !org || org.aspects.includes(a));
  }, [org, query.aspect, subjects]);

  // We have to use React refs in order to access updated state information in
  // a callback that was called (and thus was also defined) before the update.
  const meeting = useRef<Meeting>(new Meeting());
  useEffect(() => {
    const target: Person = {
      id: user.id,
      name: user.name,
      photo: user.photo,
      roles: [],
    };
    if (aspects.includes('tutoring')) target.roles.push('tutor');
    if (aspects.includes('mentoring')) target.roles.push('mentor');
    const people = [
      target,
      ...students.map((s: UserOption) => {
        const student: Person = {
          id: s.value,
          name: s.label,
          photo: s.photo || '',
          roles: [],
        };
        if (aspects.includes('tutoring')) student.roles.push('tutee');
        if (aspects.includes('mentoring')) student.roles.push('mentee');
        return student;
      }),
    ];
    const creatorIdx = people.findIndex((s) => s.id === currentUser.id);
    const creator: Person =
      creatorIdx >= 0
        ? people[creatorIdx]
        : {
            id: currentUser.id,
            name: currentUser.name,
            photo: currentUser.photo,
            roles: [],
          };
    meeting.current = new Meeting({
      time,
      creator,
      match: new Match({
        people,
        creator,
        message,
        org: org?.id || 'default',
        subjects: subjects.map((s) => s.value),
      }),
    });
  }, [currentUser, user, message, subjects, time, students, org?.id, aspects]);

  useAnalytics('Match Subjects Updated', () => ({
    subjects,
    user: user.toSegment(),
  }));
  useAnalytics('Meeting Time Updated', () => ({
    time: time?.toSegment(),
    user: user.toSegment(),
  }));
  useAnalytics('Match Message Updated', () => ({
    message,
    user: user.toSegment(),
  }));
  useAnalytics(
    'Match Errored',
    () =>
      error && {
        ...meeting.current.match.toSegment(),
        user: user.toSegment(),
        error,
      }
  );

  const onMessageChange = useCallback((event: FormEvent<HTMLInputElement>) => {
    setMessage(event.currentTarget.value);
  }, []);
  const onPhoneChange = useCallback((event: FormEvent<HTMLInputElement>) => {
    setPhone(event.currentTarget.value);
  }, []);
  const onReferenceChange = useCallback((evt: FormEvent<HTMLInputElement>) => {
    setReference(evt.currentTarget.value);
  }, []);

  const track = useTrack();

  // Signup the user via a Google Popup window if they aren't current logged in
  // **before** sending the request (this will trigger an update app-wide).
  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      const userMissingRequiredProfileProps =
        (!currentUser.phone && org?.profiles.includes('phone')) ||
        (!currentUser.reference && org?.profiles.includes('reference'));
      const userWithProps = new User({ ...currentUser, phone, reference });
      event.preventDefault();
      setLoading(true);
      if (!currentUser.id) {
        const [err] = await to(signupWithGoogle(userWithProps));
        if (err) {
          setLoading(false);
          setError(
            `An error occurred while logging in with Google. ${period(
              err.message
            )}`
          );
          return;
        }
      } else if (userMissingRequiredProfileProps) {
        const [err, res] = await to<
          AxiosResponse<UserJSON>,
          AxiosError<APIErrorJSON>
        >(axios.put('/api/account', userWithProps.toJSON()));
        if (err) {
          setLoading(false);
          setError(getErrorMessage(err, 'updating your profile', t));
          return;
        }
        await updateUser(User.fromJSON((res as AxiosResponse<UserJSON>).data));
      }
      const [err, res] = await to<
        AxiosResponse<MeetingJSON>,
        AxiosError<APIErrorJSON>
      >(axios.post('/api/meetings', meeting.current.toJSON()));
      if (err) {
        setLoading(false);
        setError(getErrorMessage(err, 'creating meeting', t));
      } else {
        const mtg = Meeting.fromJSON((res as AxiosResponse<MeetingJSON>).data);
        track('Match Created', {
          ...mtg.match.toSegment(),
          user: user.toSegment(),
        });
        setChecked(true);
      }
    },
    [user, track, currentUser, org, phone, reference, updateUser, t]
  );

  const forOthers = useMemo(
    () =>
      students.findIndex((s) => s.label === 'Me') < 0 ? 'for-others-' : '',
    [students]
  );
  const person = useMemo(() => {
    // TODO: This logic only works for English; when we add i18n we'll probably
    // have to scrap all of this "custom placeholder" logic.
    const names = students.map((s) => (s.label === 'Me' ? 'I' : s.label));
    if (names[0] === 'I') {
      names.shift();
      names.push('I');
    }
    return join(names);
  }, [students]);

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <Loader active={loading} checked={checked} />
      <div className={styles.inputs}>
        {admin && (
          <UserSelect
            required
            label={t('match3rd:students')}
            onSelectedChange={setStudents}
            selected={students}
            className={styles.field}
            outlined
          />
        )}
        <SubjectSelect
          required
          outlined
          autoOpenMenu
          label={t(`match3rd:${forOthers}subjects`)}
          className={styles.field}
          onSelectedChange={setSubjects}
          selected={subjects}
          options={[...user.tutoring.subjects, ...user.mentoring.subjects]}
          aspect={aspects.length === 1 ? aspects[0] : undefined}
        />
        <TimeSelect
          required
          outlined
          label={t(`match3rd:${forOthers}time`)}
          className={styles.field}
          onChange={setTime}
          value={time}
          uid={user.id}
        />
        <TextField
          outlined
          textarea
          rows={4}
          required
          placeholder={t('match3rd:message-placeholder', {
            person,
            subject: join(subjects.map((s) => s.label)) || 'Computer Science',
          })}
          label={t(`match3rd:${forOthers}message`)}
          className={styles.field}
          onChange={onMessageChange}
          value={message}
        />
      </div>
      <div className={styles.divider} />
      <div className={styles.inputs}>
        {!currentUser.phone && org?.profiles.includes('phone') && (
          <TextField
            label={t('user3rd:phone')}
            value={phone}
            onChange={onPhoneChange}
            className={styles.field}
            type='tel'
            outlined
            required
          />
        )}
        {!currentUser.reference && org?.profiles.includes('reference') && (
          <TextField
            className={styles.field}
            label={t('user3rd:reference', {
              org: org.name || 'Tutorbook',
            })}
            placeholder={t('common:reference-placeholder', {
              org: org.name || 'Tutorbook',
            })}
            onChange={onReferenceChange}
            value={reference}
            rows={3}
            textarea
            outlined
            required
          />
        )}
        <Button
          className={styles.btn}
          label={
            !currentUser.id ? t('match3rd:signup-btn') : t('match3rd:send-btn')
          }
          disabled={loading}
          google={!currentUser.id}
          raised
          arrow
        />
        {!!error && (
          <div data-cy='error' className={styles.error}>
            {error}
          </div>
        )}
      </div>
    </form>
  );
}
