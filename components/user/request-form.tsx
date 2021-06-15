import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Select } from '@rmwc/select';
import { TextField } from '@rmwc/textfield';
import { dequal } from 'dequal';
import to from 'await-to-js';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import useTranslation from 'next-translate/useTranslation';

import SubjectSelect, { SubjectOption } from 'components/subject-select';
import Button from 'components/button';
import Loader from 'components/loader';
import TimeSelect from 'components/time-select';

import { Aspect, isAspect } from 'lib/model';
import { Meeting, MeetingJSON } from 'lib/model';
import { Person, Role } from 'lib/model';
import { User, UserJSON } from 'lib/model';
import { join, translate } from 'lib/utils';
import { APIErrorJSON } from 'lib/api/error';
import { ListUsersRes } from 'lib/api/routes/users/list';
import { Match } from 'lib/model';
import { Timeslot } from 'lib/model';
import { UsersQuery } from 'lib/model';
import { getErrorMessage } from 'lib/fetch';
import { loginWithGoogle } from 'lib/firebase/login';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import styles from './request-form.module.scss';

export interface RequestFormProps {
  user: User;
}

export default function RequestForm({
  user: volunteer,
}: RequestFormProps): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  const { org } = useOrg();
  const { query } = useRouter();
  const { user, updateUser } = useUser();
  const { t, lang: locale } = useTranslation();
  const { data: children } = useSWR<ListUsersRes>(user.id ? new UsersQuery({ parents: [user.id] }).endpoint : null);
    
  const [child, setChild] = useState<User>(User.parse({}));
  const [student, setStudent] = useState<string>('Me');
  const [options, setOptions] = useState<Record<string, User>>({
    'Me': user, 
    'My child': child,
  });
  useEffect(() => {
    setOptions((prev) => {
      const kids = children?.users.map((u) => User.fromJSON(u)) || [];
      const updated = {
        'Me': user,
        'My child': child,
        ...Object.fromEntries(kids.map((u) => [u.firstName, u])),
      };
      if (dequal(updated, prev)) return prev;
      return updated;
    });
  }, [user, child, children]);

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [message, setMessage] = useState<string>('');
  const [time, setTime] = useState<Timeslot>();

  const [phone, setPhone] = useState<string>(user.phone);
  const [reference, setReference] = useState<string>(user.reference);

  useEffect(() => {
    async function validatePhone(): Promise<void> {
      const { default: getPhone } = await import('phone');
      setPhone((prev) => getPhone(prev)[0] || prev);
    }
    void validatePhone();
  }, [phone]);

  useEffect(() => setPhone(user.phone), [user.phone]);
  useEffect(() => setReference(user.reference), [user.reference]);

  const aspects = useMemo(() => {
    if (org?.aspects.length === 1) return org.aspects;
    const asps = new Set<Aspect>();
    if (isAspect(query.aspect)) asps.add(query.aspect);
    subjects.forEach((s) => s.aspect && asps.add(s.aspect));
    return [...asps].filter((a) => !org || org.aspects.includes(a));
  }, [org, query.aspect, subjects]);

  const userMissingData = useMemo(
    () =>
      (!user.phone && org?.profiles.includes('phone')) ||
      (!user.reference && org?.profiles.includes('reference')),
    [user.phone, user.reference, org]
  );

  // TODO: Fix the `await-to-js` types so that TypeScript knows that `res` is
  // defined whenever `err` is not defined (that way I can get rid of all the
  // unnecessary `if (res)` statements).
  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');
      setLoading(true);
      let updatedUser = User.parse({ ...user, phone, reference });
      if (!user.id) {
        const [err, signedUpUser] = await to(loginWithGoogle(updatedUser));
        if (err) {
          setLoading(false);
          setError(
            t('error:response', {
              action: 'logging in with Google',
              error: err.message,
            })
          );
          return;
        }
        if (signedUpUser) updatedUser = signedUpUser;
      } else if (userMissingData) {
        const [err, res] = await to<
          AxiosResponse<UserJSON>,
          AxiosError<APIErrorJSON>
        >(axios.put('/api/account', updatedUser.toJSON()));
        if (err) {
          setLoading(false);
          setError(getErrorMessage(err, 'updating profile', t));
          return;
        }
        if (res) {
          updatedUser = User.fromJSON(res.data);
          await updateUser(updatedUser);
        }
      }
      const volunteerRoles: Role[] = [];
      const studentRoles: Role[] = [];
      if (aspects.includes('tutoring')) {
        volunteerRoles.push('tutor');
        studentRoles.push('tutee');
      }
      if (aspects.includes('mentoring')) {
        volunteerRoles.push('mentor');
        studentRoles.push('mentee');
      }
      const people: Person[] = [{
        id: volunteer.id,
        name: volunteer.name,
        photo: volunteer.photo,
        roles: volunteerRoles,
      }];
      const creator: Person = {
        id: updatedUser.id,
        name: updatedUser.name,
        photo: updatedUser.photo,
        roles: [],
      };
      if (student === 'Me') {
        creator.roles = studentRoles;
        people.push(creator);
      } else if (student === 'My child') {
        const updatedChild = {
          ...child.toJSON(),
          roles: studentRoles, // Specifying roles skips signup emails.
          parents: [updatedUser.id], // Use now-logged-in parent ID.
        };
        const [err, res] = await to<
          AxiosResponse<UserJSON>,
          AxiosError<APIErrorJSON>
        >(axios.post('/api/users', updatedChild));
        if (err) {
          setLoading(false);
          setError(getErrorMessage(err, 'creating child account', t));
          return;
        }
        if (res) {
          creator.roles = ['parent'];
          people.push(creator);
          people.push({
            id: res.data.id,
            name: res.data.name,
            photo: res.data.photo,
            roles: studentRoles,
          });
        }
      } else {
        creator.roles = ['parent'];
        people.push(creator);
        people.push({
          id: options[student].id,
          name: options[student].name,
          photo: options[student].photo,
          roles: studentRoles,
        });
      }
      const meeting = Meeting.parse({
        time,
        creator,
        match: Match.parse({
          creator,
          people,
          message,
          org: org?.id || 'default',
          subjects: subjects.map((s) => s.value),
        }),
      });
      const [err] = await to<
        AxiosResponse<MeetingJSON>,
        AxiosError<APIErrorJSON>
      >(axios.post('/api/meetings', meeting.toJSON()));
      if (err) {
        setLoading(false);
        setError(getErrorMessage(err, 'creating meeting', t));
      } else {
        setChecked(true);
      }
    },
    [
      user,
      student,
      volunteer,
      options,
      child,
      org,
      time,
      message,
      subjects,
      aspects,
      phone,
      reference,
      updateUser,
      userMissingData,
      t,
    ]
  );

  const i18nPrefix = useMemo(() => (student !== 'Me' ? 'for-others-' : ''), [
    student,
  ]);
  const messagePlaceholder = useMemo(() => {
    const data = {
      person: student === 'Me' ? 'I' : options[student].firstName || 'They',
      subject: join(subjects.map((s) => s.label)) || 'Computer Science',
    };
    if (org?.booking[locale]?.message)
      return translate(org.booking[locale].message, data);
    return t('match3rd:message-placeholder', data);
  }, [t, locale, org, student, subjects, options]);

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <Loader active={loading} checked={checked} />
      <div className={styles.inputs}>
        <Select
          options={Object.keys(options)}
          value={student}
          onChange={(evt) => setStudent(evt.currentTarget.value)}
          label={t('match3rd:students')}
          className={styles.field}
          enhanced
          outlined
          required
        />
        {student === 'My child' && (
          <>
            <TextField
              label='Child name'
              value={child.name}
              onChange={(evt) => {
                const name = evt.currentTarget.value;
                setChild((prev) => User.parse({ ...prev, name }));
              }}
              className={styles.field}
              outlined
              required
            />
            <TextField
              label='Child age'
              value={child.age}
              onChange={(evt) => {
                const age = Number(evt.currentTarget.value);
                setChild((prev) => User.parse({ ...prev, age }));
              }}
              className={styles.field}
              type='number'
              outlined
              required
            />
          </>
        )}
      </div>
      <div className={styles.divider} />
      <div className={styles.inputs}>
        <SubjectSelect
          required
          outlined
          autoOpenMenu
          label={t(`match3rd:${i18nPrefix}subjects`)}
          className={styles.field}
          onSelectedChange={setSubjects}
          selected={subjects}
          options={volunteer.subjects}
          aspect={aspects.length === 1 ? aspects[0] : undefined}
        />
        <TimeSelect
          required
          outlined
          label={t(`match3rd:${i18nPrefix}time`)}
          className={styles.field}
          onChange={setTime}
          value={time}
          uid={volunteer.id}
        />
        <TextField
          outlined
          textarea
          rows={4}
          required
          placeholder={messagePlaceholder}
          label={t(`match3rd:${i18nPrefix}message`)}
          className={styles.field}
          onChange={(evt) => setMessage(evt.currentTarget.value)}
          value={message}
        />
        {!userMissingData && (
          <>
            <Button
              className={styles.btn}
              label={
                !user.id ? t('match3rd:login-btn') : t('match3rd:send-btn')
              }
              disabled={loading}
              google={!user.id}
              raised
              arrow
            />
            {!!error && (
              <div data-cy='error' className={styles.error}>
                {error}
              </div>
            )}
          </>
        )}
      </div>
      {userMissingData && (
        <>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            {!user.phone && org?.profiles.includes('phone') && (
              <TextField
                label={t('user3rd:phone')}
                value={phone}
                onChange={(evt) => setPhone(evt.currentTarget.value)}
                className={styles.field}
                type='tel'
                outlined
                required
              />
            )}
            {!user.reference && org?.profiles.includes('reference') && (
              <TextField
                className={styles.field}
                label={t('user3rd:reference', {
                  org: org.name || 'Tutorbook',
                })}
                placeholder={t('common:reference-placeholder', {
                  org: org.name || 'Tutorbook',
                })}
                value={reference}
                onChange={(evt) => setReference(evt.currentTarget.value)}
                rows={3}
                textarea
                outlined
                required
              />
            )}
            <Button
              className={styles.btn}
              label={
                !user.id ? t('match3rd:login-btn') : t('match3rd:send-btn')
              }
              disabled={loading}
              google={!user.id}
              raised
              arrow
            />
            {!!error && (
              <div data-cy='error' className={styles.error}>
                {error}
              </div>
            )}
          </div>
        </>
      )}
    </form>
  );
}
