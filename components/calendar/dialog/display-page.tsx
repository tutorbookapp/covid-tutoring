import { Chip, ChipSet } from '@rmwc/chip';
import { IconButton } from '@rmwc/icon-button';
import Link from 'next/link';

import Avatar from 'components/avatar';
import CloseIcon from 'components/icons/close';
import DeleteIcon from 'components/icons/delete';
import EditIcon from 'components/icons/edit';
import Loader from 'components/loader';
import OpenInNewIcon from 'components/icons/open-in-new';
import { useNav } from 'components/dialog/context';

import { getRecurString, join } from 'lib/utils';
import { User } from 'lib/model/user';

import { DialogPage, useCalendarState } from '../state';

import styles from './page.module.scss';

export interface DisplayPageProps {
  people: User[];
  loading: boolean;
  checked: boolean;
  onDeleteStop: () => void;
}

export default function DisplayPage({
  people,
  loading,
  checked,
  onDeleteStop,
}: DisplayPageProps): JSX.Element {
  const { editing, setDialogPage } = useCalendarState();
  const nav = useNav();

  return (
    <div className={styles.wrapper}>
      <Loader active={!!loading} checked={!!checked} />
      <div className={styles.nav}>
        <IconButton icon={<CloseIcon />} className={styles.btn} onClick={nav} />
        <Link href={`/${editing.match.org}/matches/${editing.match.id}`}>
          <IconButton icon={<OpenInNewIcon />} className={styles.btn} />
        </Link>
      </div>
      <div className={styles.content}>
        {people.map((person) => (
          <Link
            href={`/${editing.match.org}/users/${person.id}`}
            key={person.id}
          >
            <a className={styles.person}>
              <div className={styles.avatar}>
                <Avatar src={person.photo} size={48} />
              </div>
              <div className={styles.label}>
                <div className={styles.roles}>{join(person.roles)}</div>
                <div className={styles.name}>{person.name}</div>
              </div>
            </a>
          </Link>
        ))}
        <dl className={styles.info}>
          <dt>Subjects</dt>
          <dd>{join(editing.match.subjects)}</dd>
          <dt>Meeting link</dt>
          <dd>
            <a href={editing.venue.url}>{editing.venue.url}</a>
          </dd>
          <dt>Recurring</dt>
          <dd>{getRecurString(editing.time.recur) || 'Not recurring'}</dd>
        </dl>
      </div>
      <div className={styles.actions}>
        <ChipSet className={styles.chips}>
          <Chip
            icon={<EditIcon />}
            label='Edit meeting'
            onClick={() => setDialogPage(DialogPage.Edit)}
          />
          <Chip
            icon={<DeleteIcon />}
            label='Delete meeting'
            onClick={onDeleteStop}
          />
        </ChipSet>
      </div>
    </div>
  );
}
