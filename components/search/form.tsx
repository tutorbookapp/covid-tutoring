import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';

import FilterForm from 'components/filter-form';

import { Callback } from 'lib/model/callback';
import { UsersQuery } from 'lib/model/query/users';

import styles from './form.module.scss';

export default function Form({
  query,
  onChange,
}: {
  query: UsersQuery;
  onChange: Callback<UsersQuery>;
}): JSX.Element {
  const [elevated, setElevated] = useState<boolean>(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const listener = () => {
      if (!formRef.current) return;
      const viewportOffset = formRef.current.getBoundingClientRect();
      const updated: boolean = viewportOffset.top <= 76;
      // We have to wait a tick before changing the class for the animation to
      // work. @see {@link https://stackoverflow.com/a/37643388/10023158}
      if (updated !== elevated) setTimeout(() => setElevated(updated), 100);
    };
    window.addEventListener('scroll', listener);
    return () => window.removeEventListener('scroll', listener);
  });

  return (
    <div
      className={cn(styles.form, { [styles.elevated]: elevated })}
      ref={formRef}
    >
      <FilterForm query={query} onChange={onChange} />
    </div>
  );
}
