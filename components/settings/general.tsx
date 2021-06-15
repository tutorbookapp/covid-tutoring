import { FormEvent, useCallback } from 'react';
import { TextField } from '@rmwc/textfield';
import useTranslation from 'next-translate/useTranslation';

import PhotoInput from 'components/photo-input';
import VenueInput from 'components/venue-input';

import { Org } from 'lib/model';
import useSocialProps from 'lib/hooks/social-props';

import styles from './settings.module.scss';
import { useSettings } from './context';

export default function General(): JSX.Element {
  const { t } = useTranslation();
  const { org, setOrg } = useSettings();

  const onNameChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const name = evt.currentTarget.value;
      setOrg((prev: Org) => Org.parse({ ...prev, name }));
    },
    [setOrg]
  );
  const onEmailChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const email = evt.currentTarget.value;
      setOrg((prev: Org) => Org.parse({ ...prev, email }));
    },
    [setOrg]
  );
  const onPhoneChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const phone = evt.currentTarget.value;
      setOrg((prev: Org) => Org.parse({ ...prev, phone }));
    },
    [setOrg]
  );
  const onPhotoChange = useCallback(
    (photo: string) => {
      setOrg((prev: Org) => Org.parse({ ...prev, photo }));
    },
    [setOrg]
  );
  const onVenueChange = useCallback(
    (venue: string) => {
      setOrg((prev) => Org.parse({ ...prev, venue }));
    },
    [setOrg]
  );
  const onBioChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const bio = evt.currentTarget.value;
      setOrg((prev: Org) => Org.parse({ ...prev, bio }));
    },
    [setOrg]
  );

  const getSocialProps = useSocialProps(org, setOrg, styles.field, 'org', Org);

  return (
    <div className={styles.card}>
      <div className={styles.inputs}>
        <TextField
          label={t('org:name')}
          value={org.name}
          onChange={onNameChange}
          className={styles.field}
          required
          outlined
        />
        <TextField
          label={t('org:email')}
          value={org.email}
          onChange={onEmailChange}
          className={styles.field}
          type='email'
          required
          outlined
        />
        <TextField
          label={t('org:phone')}
          value={org.phone ? org.phone : undefined}
          onChange={onPhoneChange}
          className={styles.field}
          type='tel'
          outlined
        />
        <PhotoInput
          label={t('org:photo')}
          value={org.photo}
          onChange={onPhotoChange}
          className={styles.field}
          outlined
        />
      </div>
      <div className={styles.divider} />
      <div className={styles.inputs}>
        <VenueInput
          name={org.name}
          label={t('org:venue')}
          value={org.venue}
          onChange={onVenueChange}
          className={styles.field}
          outlined
        />
      </div>
      <div className={styles.divider} />
      <div className={styles.inputs}>
        <TextField
          label={t('org:bio')}
          placeholder={t('org:bio-placeholder', {
            name: org.name || 'Tutorbook',
          })}
          value={org.bio}
          onChange={onBioChange}
          className={styles.field}
          outlined
          required
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
      </div>
    </div>
  );
}
