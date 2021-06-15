import { FormEvent, useCallback } from 'react';
import { Snackbar, SnackbarAction } from '@rmwc/snackbar';
import { TextField } from '@rmwc/textfield';
import axios from 'axios';
import useTranslation from 'next-translate/useTranslation';

import AvailabilitySelect from 'components/availability-select';
import Header from 'components/header';
import LangSelect from 'components/lang-select';
import PhotoInput from 'components/photo-input';
import SubjectSelect from 'components/subject-select';
import VenueInput from 'components/venue-input';

import { User, UserJSON } from 'lib/model/user';
import { Availability } from 'lib/model/availability';
import { accountToSegment } from 'lib/model/account';
import useAnalytics from 'lib/hooks/analytics';
import useContinuous from 'lib/hooks/continuous';
import useSocialProps from 'lib/hooks/social-props';
import useTrack from 'lib/hooks/track';
import { useUser } from 'lib/context/user';

import styles from './profile.module.scss';

export default function Profile(): JSX.Element {
  const { t } = useTranslation();
  const { user: local, updateUser: updateLocal } = useUser();

  const track = useTrack();
  const updateRemote = useCallback(
    async (updated: User) => {
      const url = `/api/users/${updated.id}`;
      const { data } = await axios.put<UserJSON>(url, updated.toJSON());
      track('Profile Updated', accountToSegment(updated));
      return User.parse(data);
    },
    [track]
  );

  const {
    data: user,
    setData: setUser,
    loading,
    checked,
    error,
    retry,
    timeout,
  } = useContinuous(local, updateRemote, updateLocal);

  useAnalytics(
    'Profile Errored',
    () => error && { ...accountToSegment(user), error }
  );

  // TODO: Add URL verifications to ensure that the social links and esp. the
  // venue URL are all valid URLs (e.g. prepend 'https://' by default).

  const onNameChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const name = evt.currentTarget.value;
      setUser((prev) => User.parse({ ...prev, name }));
    },
    [setUser]
  );
  const onPhoneChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const phone = evt.currentTarget.value;
      setUser((prev) => User.parse({ ...prev, phone }));
    },
    [setUser]
  );
  const onPhotoChange = useCallback(
    (photo: string) => {
      setUser((prev) => User.parse({ ...prev, photo }));
    },
    [setUser]
  );
  const onBackgroundChange = useCallback(
    (background: string) => {
      setUser((prev) => User.parse({ ...prev, background }));
    },
    [setUser]
  );
  const onVenueChange = useCallback(
    (venue: string) => {
      setUser((prev) => User.parse({ ...prev, venue }));
    },
    [setUser]
  );
  const onBioChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const bio = evt.currentTarget.value;
      setUser((prev) => User.parse({ ...prev, bio }));
    },
    [setUser]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) => {
      setUser((prev) => User.parse({ ...prev, availability }));
    },
    [setUser]
  );
  const onMentoringSubjectsChange = useCallback(
    (subjects: string[]) => {
      setUser(
        (prev) =>
          User.parse({ ...prev, mentoring: { ...prev.mentoring, subjects } })
      );
    },
    [setUser]
  );
  const onTutoringSubjectsChange = useCallback(
    (subjects: string[]) => {
      setUser(
        (prev) =>
          User.parse({ ...prev, tutoring: { ...prev.tutoring, subjects } })
      );
    },
    [setUser]
  );
  const onLangsChange = useCallback(
    (langs: string[]) => {
      setUser((prev) => User.parse({ ...prev, langs }));
    },
    [setUser]
  );

  const getSocialProps = useSocialProps(
    user,
    setUser,
    styles.field,
    'user3rd',
    User
  );

  return (
    <>
      {loading && (
        <Snackbar message={t('profile:loading')} timeout={-1} leading open />
      )}
      {checked && <Snackbar message={t('profile:checked')} leading open />}
      {error && (
        <Snackbar
          message={t('profile:error', { count: timeout / 1000 })}
          timeout={-1}
          action={<SnackbarAction label={t('common:retry')} onClick={retry} />}
          leading
          open
        />
      )}
      <Header
        header={t('common:profile')}
        body={t('profile:subtitle')}
        actions={[
          {
            label: t('profile:view-profile'),
            href: `/${user.orgs[0] || 'default'}/users/${user.id}`,
          },
        ]}
      />
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.inputs}>
            <TextField
              label={t('user3rd:name')}
              value={user.name}
              onChange={onNameChange}
              className={styles.field}
              required
              outlined
            />
            <TextField
              label={t('user3rd:email')}
              value={user.email}
              className={styles.field}
              type='email'
              disabled
              readOnly
              required
              outlined
            />
            <TextField
              label={t('user3rd:phone')}
              value={user.phone ? user.phone : undefined}
              onChange={onPhoneChange}
              className={styles.field}
              type='tel'
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <PhotoInput
              label={t('user3rd:photo')}
              value={user.photo}
              onChange={onPhotoChange}
              className={styles.field}
              outlined
            />
            <PhotoInput
              label={t('user3rd:background')}
              value={user.background}
              onChange={onBackgroundChange}
              className={styles.field}
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <VenueInput
              label={t('user3rd:venue')}
              value={user.venue}
              onChange={onVenueChange}
              className={styles.field}
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <LangSelect
              className={styles.field}
              label={t('user3rd:langs')}
              placeholder={t('common:langs-placeholder')}
              onChange={onLangsChange}
              value={user.langs}
              outlined
            />
            <AvailabilitySelect
              className={styles.field}
              label={t('user3rd:availability')}
              onChange={onAvailabilityChange}
              value={user.availability}
              outlined
            />
            <TextField
              label={t('user3rd:bio')}
              placeholder={t('common:bio-placeholder')}
              helpText={{
                persistent: true,
                children: t('common:bio-help', { name: 'your' }),
              }}
              value={user.bio}
              onChange={onBioChange}
              className={styles.field}
              outlined
              rows={8}
              textarea
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <SubjectSelect
              className={styles.field}
              label={t('user3rd:tutoring-subjects')}
              onChange={onTutoringSubjectsChange}
              value={user.tutoring.subjects}
              placeholder={t('common:tutoring-subjects-placeholder')}
              aspect='tutoring'
              outlined
            />
            <SubjectSelect
              className={styles.field}
              label={t('user3rd:mentoring-subjects')}
              onChange={onMentoringSubjectsChange}
              value={user.mentoring.subjects}
              placeholder={t('common:mentoring-subjects-placeholder')}
              aspect='mentoring'
              outlined
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
          </div>
        </div>
      </div>
    </>
  );
}
