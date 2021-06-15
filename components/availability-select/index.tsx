import {
  FocusEvent,
  MouseEvent,
  UIEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MenuSurface, MenuSurfaceAnchor } from '@rmwc/menu';
import { TextField, TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import { dequal } from 'dequal/lite';
import { nanoid } from 'nanoid';
import { ResizeObserver as polyfill } from '@juggle/resize-observer';
import useMeasure from 'react-use-measure';
import useTranslation from 'next-translate/useTranslation';

import { getDateWithDay, getDateWithTime } from 'lib/utils/time';
import { Availability } from 'lib/model/availability';
import { TCallback } from 'lib/model/callback';
import { Timeslot } from 'lib/model/timeslot';
import { useUser } from 'lib/context/user';

import TimeslotRnd from './timeslot-rnd';
import { getTimeslot } from './utils';
import styles from './availability-select.module.scss';

interface Props {
  value: Availability;
  onChange: TCallback<Availability>;
  renderToPortal?: boolean;
  focused?: boolean;
  onFocused?: () => void;
  onBlurred?: () => void;
  className?: string;
}

type Overrides =
  | keyof Props
  | 'textarea'
  | 'readOnly'
  | 'onFocus'
  | 'onBlur'
  | 'inputRef'
  | 'className';

export type AvailabilitySelectProps = Omit<TextFieldHTMLProps, Overrides> &
  Omit<TextFieldProps, Overrides> &
  Props;

/**
 * The `AvailabilitySelect` emulates the drag-and-resize interface of Google
 * Calendar's event creation UI but on a much smaller scale. We use `react-rnd`
 * within an RMWC `MenuSurface` to craft our UX.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/50}
 */
function AvailabilitySelect({
  value,
  onChange,
  renderToPortal,
  focused,
  onFocused,
  onBlurred,
  className,
  ...textFieldProps
}: AvailabilitySelectProps): JSX.Element {
  const { lang: locale } = useTranslation();
  const { user } = useUser();

  const headerRef = useRef<HTMLDivElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const ticking = useRef<boolean>(false);

  const [availability, setAvailability] = useState<Availability>(value);
  const [cellsRef, { x, y }] = useMeasure({ polyfill, scroll: true });
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Throttle the `onChange` triggers to prevent expensive re-renders when the
  // user is in the middle of moving an RND (otherwise, it lags a bunch).
  // TODO: Always update top-level state before submitting API requests. Right
  // now, this is largely unecessary as it is unlikely the user will click
  // the "Submit" or "Signup" buttons w/in 500ms of editing an RND.
  useEffect(() => {
    if (dequal(value, availability)) return () => {};
    const timeoutId = setTimeout(() => onChange(availability), 1000);
    return () => clearTimeout(timeoutId);
  }, [value, onChange, availability]);

  // Sync with controlled data and ensure all timeslots have valid React keys.
  useEffect(() => {
    setAvailability((prev) => {
      const updated = Availability.parse(
        ...value.map((t) => Timeslot.parse({ ...t, id: t.id || nanoid() }))
      );
      if (dequal(prev, updated)) return prev;
      return updated;
    });
  }, [value]);

  // We use `setTimeout` and `clearTimeout` to wait a "tick" on a blur event
  // before toggling which ensures the user hasn't re-opened the menu.
  // @see {@link https:bit.ly/2x9eM27}
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutId = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (focused) inputRef.current?.focus();
  }, [focused]);

  useEffect(() => {
    // Scroll to 8:30am by default (assumes 48px per hour).
    if (rowsRef.current) rowsRef.current.scrollTop = 48 * 8 + 24;
  }, []);

  const updateTimeslot = useCallback((origIdx: number, updated?: Timeslot) => {
    setAvailability((prev) => {
      if (!updated)
        return Availability.parse(
          ...prev.slice(0, origIdx),
          ...prev.slice(origIdx + 1)
        );
      let avail: Availability;
      if (origIdx < 0) {
        avail = Availability.parse(...prev, updated).sort();
      } else {
        avail = Availability.parse(
          ...prev.slice(0, origIdx),
          updated,
          ...prev.slice(origIdx + 1)
        ).sort();
      }
      const idx = avail.findIndex((t) => t.id === updated.id);
      const last = avail[idx - 1];
      if (last && last.from.getDay() === updated.from.getDay()) {
        // Contained within another timeslot.
        if (last.to.valueOf() >= updated.to.valueOf())
          return Availability.parse(
            ...avail.slice(0, idx),
            ...avail.slice(idx + 1)
          );
        // Overlapping with end of another timeslot.
        if (last.to.valueOf() >= updated.from.valueOf())
          return Availability.parse(
            ...avail.slice(0, idx - 1),
            Timeslot.parse({ ...last, to: updated.to }),
            ...avail.slice(idx + 1)
          );
      }
      const next = avail[idx + 1];
      if (next && next.from.getDay() === updated.from.getDay()) {
        // Overlapping with start of another timeslot.
        if (next.from.valueOf() <= updated.to.valueOf())
          return Availability.parse(
            ...avail.slice(0, idx),
            Timeslot.parse({ ...next, from: updated.from }),
            ...avail.slice(idx + 2)
          );
      }
      return avail;
    });
  }, []);

  // Create a new `TimeslotRND` closest to the user's click position. Assumes
  // each column is 82px wide and every hour is 48px tall (i.e. 12px = 15min).
  const onClick = useCallback(
    (event: MouseEvent) => {
      const position = { x: event.clientX - x, y: event.clientY - y };
      const original = Timeslot.parse({ id: nanoid() });
      updateTimeslot(-1, getTimeslot(48, position, original));
    },
    [x, y, updateTimeslot]
  );

  // Sync the scroll position of the main cell grid and the static headers. This
  // was inspired by the way that Google Calendar's UI is currently setup.
  // @see {@link https://mzl.la/35OIC9y}
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (!ticking.current) {
      requestAnimationFrame(() => {
        if (timesRef.current) timesRef.current.scrollTop = scrollTop;
        if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  const weekdayCells = useMemo(
    () =>
      Array(7)
        .fill(null)
        .map((_, weekday) => (
          <div key={nanoid()} className={styles.titleWrapper}>
            <h2 className={styles.titleContent}>
              <div className={styles.day}>
                {getDateWithDay(weekday).toLocaleString(locale, {
                  weekday: 'long',
                })}
              </div>
            </h2>
          </div>
        )),
    [locale]
  );
  const timeCells = useMemo(
    () =>
      Array(24)
        .fill(null)
        .map((_, hour) => (
          <div key={nanoid()} className={styles.timeWrapper}>
            <span className={styles.timeLabel}>
              {getDateWithTime(hour).toLocaleString(locale, {
                hour: '2-digit',
              })}
            </span>
          </div>
        )),
    [locale]
  );
  const headerCells = useMemo(
    () =>
      Array(7)
        .fill(null)
        .map(() => <div key={nanoid()} className={styles.headerCell} />),
    []
  );
  const lineCells = useMemo(
    () =>
      Array(24)
        .fill(null)
        .map(() => <div key={nanoid()} className={styles.line} />),
    []
  );
  const dayCells = useMemo(
    () =>
      Array(7)
        .fill(null)
        .map(() => <div key={nanoid()} className={styles.cell} />),
    []
  );

  return (
    <MenuSurfaceAnchor className={className}>
      <MenuSurface
        tabIndex={-1}
        open={menuOpen}
        onFocus={(event: FocusEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (inputRef.current) inputRef.current.focus();
        }}
        anchorCorner='bottomStart'
        className={styles.menuSurface}
        renderToPortal={renderToPortal ? '#portal' : false}
        data-cy='availability-select-surface'
      >
        <div className={styles.headerWrapper}>
          <div ref={headerRef} className={styles.headerContent}>
            <div className={styles.headers}>{weekdayCells}</div>
            <div className={styles.headerCells}>{headerCells}</div>
          </div>
          <div className={styles.scroller} />
        </div>
        <div className={styles.gridWrapper}>
          <div className={styles.grid}>
            <div className={styles.timesWrapper} ref={timesRef}>
              <div className={styles.times}>{timeCells}</div>
            </div>
            <div
              className={styles.rowsWrapper}
              onScroll={onScroll}
              ref={rowsRef}
            >
              <div className={styles.rows}>
                <div className={styles.lines}>{lineCells}</div>
                <div className={styles.space} />
                <div className={styles.cells} onClick={onClick} ref={cellsRef}>
                  {availability.map((timeslot: Timeslot, origIdx: number) => (
                    <TimeslotRnd
                      key={timeslot.id || nanoid()}
                      value={timeslot}
                      onChange={(updated) => updateTimeslot(origIdx, updated)}
                    />
                  ))}
                  {dayCells}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MenuSurface>
      <TextField
        {...textFieldProps}
        readOnly
        textarea={false}
        inputRef={inputRef}
        value={availability.toString(locale, user.timezone)}
        className={styles.textField}
        onFocus={() => {
          if (onFocused) onFocused();
          if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
          }
          setMenuOpen(true);
        }}
        onBlur={() => {
          if (onBlurred) onBlurred();
          timeoutId.current = setTimeout(() => setMenuOpen(false), 0);
        }}
      />
    </MenuSurfaceAnchor>
  );
}

export default memo(AvailabilitySelect, dequal);
