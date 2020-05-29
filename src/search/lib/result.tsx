import { Ripple } from '@rmwc/ripple';
import { User } from '@tutorbook/model';

import styles from './result.module.scss';

interface Props {
  user: User;
  onClick: (event: React.SyntheticEvent<HTMLElement>) => any;
}

export default function UserListItem({ user, onClick }: Props): JSX.Element {
  return (
    <Ripple>
      <li className={styles.listItem} onClick={onClick}>
        <div
          className={styles.img}
          style={{ 'background-image': `url('${user.photo}')` }}
        />
        <div className={styles.name}>{user.name}</div>
        <div className={styles.bio}>{user.bio}</div>
      </li>
    </Ripple>
  );
}