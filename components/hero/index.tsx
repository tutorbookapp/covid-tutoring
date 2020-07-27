import { UsersQuery, User, Aspect } from 'lib/model';
import { Card } from '@rmwc/card';

import useTranslation from 'next-translate/useTranslation';

import React, { useMemo, useState, useCallback } from 'react';
import RequestDialog from 'components/request-dialog';
import Carousel from 'components/carousel';
import Title from 'components/title';
import SearchForm from './search-form';

import styles from './hero.module.scss';

export default function Hero({ aspect }: { aspect: Aspect }): JSX.Element {
  const { t } = useTranslation();
  const [viewing, setViewing] = useState<User | undefined>();
  const onClosed = useCallback(() => setViewing(undefined), []);
  const subjects = useMemo(() => [], []);
  const query = useMemo(() => {
    return new UsersQuery({ aspect, visible: true });
  }, [aspect]);
  return (
    <div className={styles.hero}>
      <div className={styles.wrapper}>
        {!!viewing && (
          <RequestDialog
            user={viewing}
            aspect={aspect}
            onClosed={onClosed}
            subjects={subjects}
          />
        )}
        <div className={styles.title}>
          <Title>{t(`about:hero-${aspect}-title`)}</Title>
        </div>
        <Card className={styles.card}>
          <SearchForm aspect={aspect} />
        </Card>
        <Carousel query={query} onClick={setViewing} />
      </div>
    </div>
  );
}
