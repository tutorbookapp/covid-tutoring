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
import { v4 as uuid } from 'uuid';

import SubjectSelect, { SubjectOption } from 'components/subject-select';
import UserSelect, { UserOption } from 'components/user-select';
import Button from 'components/button';
import Loader from 'components/loader';
import TimeSelect from 'components/time-select';

import {
  Aspect,
  Match,
  MatchJSON,
  Person,
  Timeslot,
  User,
  UserJSON,
  isAspect,
} from 'lib/model';
import { join, period } from 'lib/utils';
import { useAnalytics, useTrack } from 'lib/hooks';
import { APIErrorJSON } from 'lib/api/error';
import { signupWithGoogle } from 'lib/firebase/signup';
import { useOrg } from 'lib/context/org';
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

  const aspects = useRef<Aspect[]>([]);
  const [students, setStudents] = useState<UserOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [message, setMessage] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [time, setTime] = useState<Timeslot>();

  useEffect(() => {
    setStudents((prev) =>
      prev.length || !currentUser.id
        ? prev
        : [
            {
              label: 'Myself',
              value: currentUser.id,
              photo: currentUser.photo,
            },
          ]
    );
  }, [currentUser]);

  useEffect(() => {
    if (isAspect(query.aspect) && !aspects.current.includes(query.aspect))
      aspects.current.push(query.aspect);
  }, [query.aspect]);
  useEffect(() => {
    subjects.forEach((s) => {
      if (s.aspect && !aspects.current.includes(s.aspect))
        aspects.current.push(s.aspect);
    });
  }, [subjects]);

  // We have to use React refs in order to access updated state information in
  // a callback that was called (and thus was also defined) before the update.
  const match = useRef<Match>(new Match());
  useEffect(() => {
    const target: Person = {
      id: user.id,
      name: user.name,
      photo: user.photo,
      roles: [],
      handle: uuid(),
    };
    if (aspects.current.includes('tutoring')) target.roles.push('tutor');
    if (aspects.current.includes('mentoring')) target.roles.push('mentor');
    const people = [
      target,
      ...students.map((s: UserOption) => {
        const student: Person = {
          id: s.value,
          name: s.label,
          photo: s.photo || '',
          roles: [],
          handle: uuid(),
        };
        if (aspects.current.includes('tutoring')) student.roles.push('tutee');
        if (aspects.current.includes('mentoring')) student.roles.push('mentee');
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
            handle: uuid(),
            roles: [],
          };
    match.current = new Match({
      time,
      people,
      creator,
      message,
      org: org?.id || 'default',
      subjects: subjects.map((s) => s.value),
    });
  }, [currentUser, user, message, subjects, time, students, org?.id]);

  useAnalytics('Match Subjects Updated', () => ({
    subjects,
    user: user.toSegment(),
  }));
  useAnalytics('Match Time Updated', () => ({
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
      error && { ...match.current.toSegment(), user: user.toSegment(), error }
  );

  const onMessageChange = useCallback((event: FormEvent<HTMLInputElement>) => {
    setMessage(event.currentTarget.value);
  }, []);
  const onPhoneChange = useCallback((event: FormEvent<HTMLInputElement>) => {
    setPhone(event.currentTarget.value);
  }, []);

  const phoneRequired = useMemo(() => {
    return org ? org.profiles.includes('phone') : false;
  }, [org]);

  const track = useTrack();

  // Signup the user via a Google Popup window if they aren't current logged in
  // **before** sending the request (this will trigger an update app-wide).
  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      if (!currentUser.id) {
        const [err] = await to(signupWithGoogle(currentUser));
        if (err) {
          setLoading(false);
          setError(
            `An error occurred while logging in with Google. ${err.message}`
          );
          return;
        }
      } else if (!currentUser.phone && phoneRequired) {
        const [err, res] = await to<
          AxiosResponse<UserJSON>,
          AxiosError<APIErrorJSON>
        >(
          axios.put(`/api/users/${currentUser.id}`, {
            ...currentUser.toJSON(),
            phone,
          })
        );
        if (err && err.response) {
          setLoading(false);
          setError(
            `An error occurred while adding your phone number. ${period(
              (err.response.data || err).message
            )}`
          );
          return;
        }
        if (err && err.request) {
          setLoading(false);
          setError(
            'An error occurred while adding your phone number. Please check ' +
              'your Internet connection and try again.'
          );
          return;
        }
        if (err) {
          setLoading(false);
          setError(
            `An error occurred while adding your phone number. ${period(
              err.message
            )} Please check your Internet connection and try again.`
          );
          return;
        }
        await updateUser(User.fromJSON((res as AxiosResponse<UserJSON>).data));
      }
      const [err, res] = await to<
        AxiosResponse<MatchJSON>,
        AxiosError<APIErrorJSON>
      >(axios.post('/api/matches', match.current.toJSON()));
      if (err && err.response) {
        setLoading(false);
        setError(
          `An error occurred while sending your request. ${period(
            (err.response.data || err).message
          )}`
        );
      } else if (err && err.request) {
        setLoading(false);
        setError(
          'An error occurred while sending your request. Please check your ' +
            'Internet connection and try again.'
        );
      } else if (err) {
        setLoading(false);
        setError(
          `An error occurred while sending your request. ${period(
            err.message
          )} Please check your Internet connection and try again.`
        );
      } else {
        setChecked(true);
        const created = Match.fromJSON((res as AxiosResponse<MatchJSON>).data);
        track('Match Created', {
          ...created.toSegment(),
          user: user.toSegment(),
        });
      }
    },
    [user, track, currentUser, phoneRequired, phone, updateUser]
  );

  const forOthers = useMemo(() => {
    if (students.length === 1 && students[0].label === 'Myself') return '';
    return 'for-others-';
  }, [students]);

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <Loader active={loading} checked={checked} />
      <div className={styles.inputs}>
        {!currentUser.phone && phoneRequired && (
          <TextField
            label={t('match3rd:phone')}
            value={phone}
            onChange={onPhoneChange}
            className={styles.field}
            type='tel'
            outlined
            required
          />
        )}
        {admin && (
          <UserSelect
            required
            label={t('match3rd:students')}
            onSelectedChange={setStudents}
            selected={students}
            className={styles.field}
            renderToPortal
            outlined
          />
        )}
        <SubjectSelect
          required
          outlined
          autoOpenMenu
          renderToPortal
          label={t(`match3rd:${forOthers}subjects`)}
          className={styles.field}
          onSelectedChange={setSubjects}
          selected={subjects}
          options={[...user.tutoring.subjects, ...user.mentoring.subjects]}
          aspect={isAspect(query.aspect) ? query.aspect : undefined}
        />
        <TimeSelect
          required
          outlined
          renderToPortal
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
          characterCount
          maxLength={500}
          placeholder={t('match3rd:message-placeholder', {
            subject: (subjects[0] || { label: 'Computer Science' }).label,
            person: forOthers ? join(students.map((s) => s.label)) : 'I',
          })}
          label={t(`match3rd:${forOthers}message`)}
          className={styles.field}
          onChange={onMessageChange}
          value={message}
        />
        <Button
          className={styles.button}
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
