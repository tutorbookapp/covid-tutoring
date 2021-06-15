import { useMemo } from 'react';
import useTranslation from 'next-translate/useTranslation';

import Carousel from 'components/carousel';
import Title from 'components/title';

import { UsersQuery } from 'lib/model';

import SearchForm from './search-form';
import styles from './hero.module.scss';

export default function Hero(): JSX.Element {
  const { t } = useTranslation();

  // TODO: Why is only mentoring being shown here? Shouldn't it change?
  const query = useMemo(
    () => new UsersQuery({ aspect: 'mentoring', visible: true }),
    []
  );

  return (
    <div className={styles.hero}>
      <div className={styles.wrapper}>
        <div className={styles.content}>
          <Title>{t('about:hero-header')}</Title>
          <h3>{t('about:hero-body')}</h3>
        </div>
        <div className={styles.card}>
          <SearchForm />
        </div>
        <Carousel query={query} />
      </div>
    </div>
  );
}
