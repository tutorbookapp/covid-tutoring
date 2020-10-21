import { FormEvent, useCallback, useEffect } from 'react';
import { TextField, TextFieldHelperText } from '@rmwc/textfield';
import { animated, useSpring } from 'react-spring';
import axios from 'axios';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Button from 'components/button';
import Loader from 'components/loader';
import PhotoInput from 'components/photo-input';
import SubjectSelect from 'components/subject-select';
import TimesSelect from 'components/times-select';
import Title from 'components/title';

import { Aspect, Availability, User, UserJSON } from 'lib/model';
import { useSingle, useSocialProps } from 'lib/hooks';
import { signup } from 'lib/firebase/signup';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import styles from './signup.module.scss';

interface SignupProps {
  aspect: Aspect;
}

export default function Signup({ aspect }: SignupProps): JSX.Element {
  const updateRemote = useCallback(async (updated: User) => {
    if (!updated.id) return signup(updated);
    const url = `/api/users/${updated.id}`;
    const { data } = await axios.put<UserJSON>(url, updated.toJSON());
    return User.fromJSON(data);
  }, []);

  const { org } = useOrg();
  const { t, lang: locale } = useTranslation();
  const { user: local, updateUser: updateLocal } = useUser();
  const {
    data: user,
    setData: setUser,
    onSubmit,
    error,
    loading,
    checked,
  } = useSingle(local, updateRemote, updateLocal);

  const getSocialProps = useSocialProps(user, setUser, styles.field, 'user3rd');

  useEffect(() => {
    if (!org) return;
    setUser((prev) => {
      const orgs = new Set(prev.orgs);
      orgs.add(org.id);
      return new User({ ...prev, orgs: [...orgs] });
    });
  }, [setUser, org]);

  const mentorsHProps = useSpring({
    transform: `translateY(-${aspect === 'mentoring' ? 0 : 100}%)`,
  });
  const mentorsBProps = useSpring({
    transform: `translateY(-${aspect === 'mentoring' ? 0 : 100}%)`,
  });
  const tutorsHProps = useSpring({
    transform: `translateY(${aspect === 'tutoring' ? 0 : 100}%)`,
  });
  const tutorsBProps = useSpring({
    transform: `translateY(${aspect === 'tutoring' ? 0 : 100}%)`,
  });

  const onNameChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const name = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, name }));
    },
    [setUser]
  );
  const onEmailChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const email = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, email }));
    },
    [setUser]
  );
  const onPhoneChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const phone = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, phone }));
    },
    [setUser]
  );
  const onPhotoChange = useCallback(
    (photo: string) => {
      setUser((prev) => new User({ ...prev, photo }));
    },
    [setUser]
  );
  const onBioChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const bio = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, bio }));
    },
    [setUser]
  );
  const onSubjectsChange = useCallback(
    (subjects: string[]) => {
      setUser(
        (prev) => new User({ ...prev, [aspect]: { ...prev[aspect], subjects } })
      );
    },
    [setUser, aspect]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) => {
      setUser((prev) => new User({ ...prev, availability }));
    },
    [setUser]
  );

  return (
    <div className={styles.wrapper}>
      <div className={cn(styles.header, { [styles.loading]: !org })}>
        <animated.div style={mentorsHProps}>
          <Title>
            {!org ? '' : (org.signup[locale].mentoring || {}).header || ''}
          </Title>
        </animated.div>
        <animated.div style={tutorsHProps}>
          <Title>
            {!org ? '' : (org.signup[locale].tutoring || {}).header || ''}
          </Title>
        </animated.div>
      </div>
      <div className={cn(styles.description, { [styles.loading]: !org })}>
        <animated.div style={mentorsBProps}>
          {!org ? '' : (org.signup[locale].mentoring || {}).body || ''}
        </animated.div>
        <animated.div style={tutorsBProps}>
          {!org ? '' : (org.signup[locale].tutoring || {}).body || ''}
        </animated.div>
      </div>
      <div className={styles.formCard}>
        <Loader active={loading} checked={checked} />
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.inputs}>
            <TextField
              label={t('user3rd:name')}
              value={user.name}
              onChange={onNameChange}
              className={styles.field}
              outlined
              required={org ? org.profiles.includes('name') : true}
            />
            <TextField
              label={t('user3rd:email')}
              value={user.email}
              onChange={onEmailChange}
              className={styles.field}
              type='email'
              outlined
              required={org ? org.profiles.includes('email') : true}
            />
            <TextField
              label={t('user3rd:phone')}
              value={user.phone ? user.phone : undefined}
              onChange={onPhoneChange}
              className={styles.field}
              type='tel'
              outlined
              required={org ? org.profiles.includes('phone') : false}
            />
            <PhotoInput
              label={t('user3rd:photo')}
              value={user.photo}
              onChange={onPhotoChange}
              className={styles.field}
              outlined
              required={org ? org.profiles.includes('photo') : false}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <SubjectSelect
              label={t(`user3rd:${aspect}-subjects`)}
              placeholder={t(`common:${aspect}-subjects-placeholder`)}
              value={user[aspect].subjects}
              onChange={onSubjectsChange}
              className={styles.field}
              aspect={aspect}
              required={org ? org.profiles.includes('subjects') : true}
              outlined
            />
            <TimesSelect
              className={styles.field}
              label={t('user3rd:availability')}
              onChange={onAvailabilityChange}
              value={user.availability}
              required={org ? org.profiles.includes('availability') : true}
              outlined
            />
            <TextField
              label={t('user3rd:bio')}
              placeholder={t('user3rd:bio-placeholder')}
              value={user.bio}
              onChange={onBioChange}
              className={styles.field}
              required={org ? org.profiles.includes('bio') : true}
              outlined
              rows={8}
              textarea
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <TextField {...getSocialProps('website')} />
            <TextField {...getSocialProps('facebook')} />
            <TextField {...getSocialProps('instagram')} />
            <TextField {...getSocialProps('twitter')} />
            <TextField {...getSocialProps('linkedin')} />
            <TextField {...getSocialProps('github')} />
            <TextField {...getSocialProps('indiehackers')} />
            <Button
              className={styles.btn}
              label={t(
                user.id ? 'user3rd:update-btn' : `user3rd:${aspect}-btn`
              )}
              disabled={loading}
              raised
              arrow
            />
            {!!error && (
              <TextFieldHelperText
                data-cy='error'
                persistent
                validationMsg
                className={styles.error}
              >
                {t('user3rd:error', { error: error.message })}
              </TextFieldHelperText>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
