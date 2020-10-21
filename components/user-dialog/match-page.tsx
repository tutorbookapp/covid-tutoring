import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { TextField, TextFieldHelperText } from '@rmwc/textfield';
import { IconButton } from '@rmwc/icon-button';
import to from 'await-to-js';
import useTranslation from 'next-translate/useTranslation';
import { v4 as uuid } from 'uuid';

import SubjectSelect, { SubjectOption } from 'components/subject-select';
import UserSelect, { UserOption } from 'components/user-select';
import Button from 'components/button';
import Loader from 'components/loader';
import Result from 'components/search/result';
import AvailabilitySelect from 'components/availability-select';

import {
  Aspect,
  Availability,
  Match,
  MatchJSON,
  Person,
  RequestJSON,
  User,
  UserJSON,
} from 'lib/model';
import { APIError } from 'lib/api/error';
import Utils from 'lib/utils';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import styles from './form-page.module.scss';

export interface MatchPageProps {
  value: UserJSON;
  matching: RequestJSON[];
  openDisplay: () => Promise<void>;
}

export default memo(function MatchPage({
  value,
  matching,
  openDisplay,
}: MatchPageProps): JSX.Element {
  const { org } = useOrg();
  const { user } = useUser();
  const { t } = useTranslation();

  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const aspects = useRef<Set<Aspect>>(new Set());
  const [students, setStudents] = useState<UserOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [message, setMessage] = useState<string>('');
  const [times, setTimes] = useState<Availability>(new Availability());

  const msgPlaceholder = useMemo(
    () =>
      t('match:message-placeholder', {
        student: students[0] ? students[0].label.split(' ')[0] : 'Nick',
        subject: subjects[0] ? subjects[0].label : 'Computer Science',
        tutor: value.name.split(' ')[0],
      }),
    [t, students, subjects, value.name]
  );

  const onMessageChange = useCallback((evt: FormEvent<HTMLInputElement>) => {
    setMessage(evt.currentTarget.value);
  }, []);
  const onMessageFocus = useCallback(() => {
    setMessage((prev: string) => prev || msgPlaceholder.replace('Ex: ', ''));
  }, [msgPlaceholder]);

  useEffect(() => {
    subjects.forEach((s) => {
      if (s.aspect) aspects.current.add(s.aspect);
    });
  }, [subjects]);
  useEffect(() => {
    const options = [...value.tutoring.subjects, ...value.mentoring.subjects];
    setSubjects((prev: SubjectOption[]) => {
      const selected: Set<string> = new Set();
      prev.forEach((subject: SubjectOption) => {
        if (options.includes(subject.value)) selected.add(subject.value);
      });
      matching.forEach((request: RequestJSON) => {
        request.subjects.forEach((subject: string) => {
          if (options.includes(subject)) selected.add(subject);
        });
      });
      return [...selected].map((s) => ({ label: s, value: s }));
    });
  }, [value.tutoring.subjects, value.mentoring.subjects, matching]);
  useEffect(() => {
    const selected: UserOption[] = [];
    matching.forEach((request: RequestJSON) => {
      request.people.forEach((person: Person) => {
        if (person.roles.includes('tutor') || person.roles.includes('tutee'))
          aspects.current.add('tutoring');
        if (person.roles.includes('mentor') || person.roles.includes('mentee'))
          aspects.current.add('mentoring');
        if (selected.findIndex((s) => s.value === person.id) < 0)
          selected.push({
            value: person.id,
            label: person.name || person.id,
            photo: person.photo,
          });
      });
    });
    if (selected.length) setStudents(selected);
  }, [matching]);
  useEffect(() => {
    let msg = '';
    matching.forEach((r: RequestJSON) => {
      msg += !msg && !r.message.endsWith(' ') ? r.message : ` ${r.message}`;
    });
    if (msg) setMessage(msg);
  }, [matching]);

  const match = useMemo(() => {
    const asps: Aspect[] = [...aspects.current];
    const target: Person = {
      id: value.id,
      name: value.name,
      photo: value.photo,
      roles: [],
      handle: uuid(),
    };
    if (asps.includes('tutoring')) target.roles.push('tutor');
    if (asps.includes('mentoring')) target.roles.push('mentor');
    const people: Person[] = [
      target,
      ...students.map((s: UserOption) => {
        const student: Person = {
          id: s.value,
          name: s.label,
          photo: s.photo || '',
          roles: [],
          handle: uuid(),
        };
        if (asps.includes('tutoring')) student.roles.push('tutee');
        if (asps.includes('mentoring')) student.roles.push('mentee');
        return student;
      }),
    ];
    return new Match({
      times,
      people,
      message,
      org: org?.id || 'default',
      subjects: subjects.map((s) => s.value),
      creator: {
        id: user.id,
        name: user.name,
        photo: user.photo,
        roles: [],
        handle: uuid(),
      },
    });
  }, [value, user, students, subjects, message, times, org?.id]);

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setLoading(true);
      const [err] = await to<AxiosResponse<MatchJSON>, AxiosError<APIError>>(
        axios.post('/api/matches', match.toJSON())
      );
      if (err && err.response) {
        setLoading(false);
        setError(
          `An error occurred while creating your match. ${Utils.period(
            (err.response.data || err).message
          )}`
        );
      } else if (err && err.request) {
        setLoading(false);
        setError(
          'An error occurred while creating your match. Please check your ' +
            'Internet connection and try again.'
        );
      } else if (err) {
        setLoading(false);
        setError(
          `An error occurred while creating your match. ${Utils.period(
            err.message
          )} Please check your Internet connection and try again.`
        );
      } else {
        setChecked(true);
        // Wait one sec to show checkmark animation before hiding the loading
        // overlay and letting the user edit their newly created/updated user.
        setTimeout(() => openDisplay().then(() => setLoading(false)), 1000);
      }
    },
    [match, openDisplay]
  );

  return (
    <div className={styles.wrapper}>
      <Loader active={loading} checked={checked} />
      <div className={styles.nav}>
        <IconButton className={styles.btn} icon='close' onClick={openDisplay} />
      </div>
      <div className={styles.content}>
        <Result user={User.fromJSON(value)} className={styles.display} />
        <form className={styles.form} onSubmit={onSubmit}>
          <UserSelect
            required
            label={t('common:students')}
            onSelectedChange={setStudents}
            selected={students}
            className={styles.field}
            renderToPortal
            outlined
          />
          <SubjectSelect
            required
            autoOpenMenu
            options={[...value.tutoring.subjects, ...value.mentoring.subjects]}
            label={t('common:subjects')}
            onSelectedChange={setSubjects}
            selected={subjects}
            className={styles.field}
            renderToPortal
            outlined
          />
          <AvailabilitySelect
            required
            label={t('common:times')}
            onChange={setTimes}
            value={times}
            className={styles.field}
            renderToPortal
            outlined
          />
          <TextField
            textarea
            rows={4}
            required
            characterCount
            maxLength={700}
            label={t('common:message')}
            placeholder={msgPlaceholder}
            onChange={onMessageChange}
            onFocus={onMessageFocus}
            value={message}
            className={styles.field}
            outlined
          />
          <Button
            className={styles.btn}
            label={t('match:create-btn')}
            disabled={loading}
            raised
            arrow
          />
          {!!error && (
            <TextFieldHelperText
              persistent
              validationMsg
              className={styles.error}
            >
              {error}
            </TextFieldHelperText>
          )}
        </form>
      </div>
    </div>
  );
});
