import { useMemo } from 'react';

import { Timeslot } from 'lib/model/timeslot';

import { WIDTH, getHeight, getPosition } from './utils';
import styles from './option-rnd.module.scss';

interface OptionRndProps {
  value: Timeslot;
  width?: number;
}

export default function OptionRnd({
  value,
  width = WIDTH,
}: OptionRndProps): JSX.Element {
  const pos = useMemo(() => getPosition(value.from, width), [value, width]);
  const height = useMemo(() => getHeight(value), [value]);

  const style = useMemo(
    () => ({
      top: pos.y,
      left: pos.x,
      height: `${height}px`,
      width: `${width - 1}px`,
    }),
    [pos, height, width]
  );

  return <div className={styles.option} style={style} />;
}
