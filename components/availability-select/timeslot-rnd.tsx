import { DraggableData, Position, Props, ResizableDelta } from 'react-rnd';
import {
  ElementRef,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { IconButton } from '@rmwc/icon-button';
import { ResizeDirection } from 're-resizable';
import dynamic from 'next/dynamic';
import useTranslation from 'next-translate/useTranslation';

import CloseIcon from 'components/icons/close';

import { TCallback } from 'lib/model';
import { Timeslot } from 'lib/model';

import { WIDTH, getHeight, getPosition, getTimeslot } from './utils';
import styles from './timeslot-rnd.module.scss';

const Rnd = dynamic<Props>(() => import('react-rnd').then((m) => m.Rnd));

interface TimeslotRndProps {
  value: Timeslot;
  width?: number;
  onChange: TCallback<Timeslot | undefined>;
}

/**
 * In our calendar grid, there are 48px to each hour. We allow users to specify
 * availability in 15min (or 12px) increments. This wrapper class calculates and
 * updates the `react-rnd` pos and size based on a given `Timeslot` value.
 * Note that this component **only** cares about the hours and minutes in the
 * `Timeslot` (i.e. you must pos it into the correct date column yourself).
 */
export default function TimeslotRnd({
  value,
  onChange,
  width = WIDTH,
}: TimeslotRndProps): JSX.Element {
  const { lang: locale } = useTranslation();

  // Workaround for `react-rnd`'s unusual resizing behavior.
  // @see {@link https://codesandbox.io/s/1z7kjjk0pq?file=/src/index.js}
  // @see {@link https://github.com/bokuweb/react-rnd/issues/457}
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });

  const pos = useMemo(() => getPosition(value.from, width), [value, width]);
  const height = useMemo(() => getHeight(value), [value]);

  const remove = useCallback(() => onChange(undefined), [onChange]);
  const update = useCallback(
    (newHeight: number, newPosition: Position) => {
      onChange(getTimeslot(newHeight, newPosition, value, width));
    },
    [width, onChange, value]
  );

  const onClick = useCallback((e: ReactMouseEvent) => e.stopPropagation(), []);
  const onResizeStop = useCallback(() => setOffset({ x: 0, y: 0 }), []);
  const onResize = useCallback(
    (
      e: MouseEvent | TouchEvent,
      dir: ResizeDirection,
      ref: ElementRef<'div'>,
      delta: ResizableDelta
    ) => {
      // We use `offset` to ensure we don't duplicate position updates. This
      // callback can be called multiple times for the same resize delta. Thus,
      // we only want to update `pos` to reflect the **difference** btwn the
      // last `delta` and the current `delta`.
      update(Number(ref.style.height.replace('px', '')), {
        x: pos.x - (dir === 'left' ? delta.width - offset.x : 0),
        y: pos.y - (dir === 'top' ? delta.height - offset.y : 0),
      });
      setOffset((prev: Position) => ({
        x: dir === 'left' ? delta.width : prev.x,
        y: dir === 'top' ? delta.height : prev.y,
      }));
    },
    [update, pos, offset]
  );
  const onDrag = useCallback(
    (
      e: ReactMouseEvent | ReactTouchEvent | MouseEvent | TouchEvent,
      data: DraggableData
    ) => {
      // We don't have to use the `lastY` workaround b/c `react-draggable` snaps
      // correctly for the `onDrag` callback.
      // @see {@link https://github.com/STRML/react-draggable/issues/413}
      // @see {@link https://github.com/bokuweb/react-rnd/issues/453}
      update(height, { x: data.x, y: data.y });
    },
    [update, height]
  );

  return (
    <Rnd
      data-cy='timeslot-rnd'
      className={styles.timeslot}
      position={pos}
      minHeight={12 * 4}
      size={{ width: width - 10, height }}
      onResizeStop={onResizeStop}
      onResize={onResize}
      onClick={onClick}
      onDrag={onDrag}
      bounds='parent'
      resizeGrid={[0, 12]}
      dragGrid={[width, 12]}
      enableResizing={{
        bottom: true,
        bottomLeft: false,
        bottomRight: false,
        left: false,
        right: false,
        top: true,
        topLeft: false,
        topRight: false,
      }}
    >
      <div className={styles.wrapper}>
        <IconButton
          className={styles.btn}
          icon={<CloseIcon />}
          onClick={remove}
        />
        <div className={styles.content}>
          <div>
            {value.from.toLocaleString(locale, {
              hour: 'numeric',
              minute: 'numeric',
            })}
          </div>
          <div>
            {value.to.toLocaleString(locale, {
              hour: 'numeric',
              minute: 'numeric',
            })}
          </div>
        </div>
      </div>
    </Rnd>
  );
}
