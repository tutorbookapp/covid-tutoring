import Link from 'next/link';
import { MouseEvent } from 'react';
import { Ripple } from '@rmwc/ripple';
import cn from 'classnames';

import Avatar from 'components/avatar';

import { TCallback } from 'lib/model/callback';
import { User } from 'lib/model/user';

import styles from './result.module.scss';

interface ResultButtonProps {
  user?: User;
  className?: string;
  loading?: boolean;
  avatar?: boolean;
  onClick?: TCallback<MouseEvent<HTMLElement>>;
}

function ResultButton({
  user,
  className,
  loading,
  onClick,
  avatar = true,
}: ResultButtonProps): JSX.Element {
  return (
    <Ripple disabled={loading || !onClick} onClick={onClick}>
      <div
        data-cy='result'
        className={cn(styles.listItem, className, {
          [styles.disabled]: !onClick && !loading,
          [styles.loading]: loading,
          [styles.avatar]: avatar,
        })}
      >
        {avatar && (
          <div className={styles.img}>
            <Avatar size={85} loading={loading} src={(user || {}).photo} />
          </div>
        )}
        <div className={styles.name}>{user && user.name}</div>
        <div className={styles.bio}>{user && user.bio}</div>
      </div>
    </Ripple>
  );
}

interface ResultLinkProps {
  user?: User;
  className?: string;
  loading?: boolean;
  avatar?: boolean;
  href: string;
  newTab?: boolean;
}

// TODO: Refactor this to use the `passHref` prop on `Link` to forward the href
// to the `Ripple` component which will in turn forward it to the `a` tag.
function ResultLink({
  user,
  className,
  loading,
  href,
  newTab,
  avatar = true,
}: ResultLinkProps): JSX.Element {
  return (
    <Ripple disabled={loading || !href}>
      <div
        data-cy='result'
        className={cn(styles.listItem, className, {
          [styles.disabled]: !href && !loading,
          [styles.loading]: loading,
          [styles.avatar]: avatar,
        })}
      >
        <Link href={href}>
          <a className={styles.link} target={newTab ? '_blank' : undefined}>
            {avatar && (
              <div className={styles.img}>
                <Avatar size={85} loading={loading} src={(user || {}).photo} />
              </div>
            )}
            <div className={styles.name}>{user && user.name}</div>
            <div className={styles.bio}>{user && user.bio}</div>
          </a>
        </Link>
      </div>
    </Ripple>
  );
}

function isResultLinkProps(
  props: ResultLinkProps | ResultButtonProps
): props is ResultLinkProps {
  return !!(props as ResultLinkProps).href;
}

export default function Result(
  props: ResultLinkProps | ResultButtonProps
): JSX.Element {
  if (isResultLinkProps(props)) return <ResultLink {...props} />;
  return <ResultButton {...props} />;
}
