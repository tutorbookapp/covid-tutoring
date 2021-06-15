import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { animated, useSpring } from 'react-spring';
import cn from 'classnames';
import mergeRefs from 'react-merge-refs';
import { ResizeObserver as polyfill } from '@juggle/resize-observer';
import useMeasure from 'react-use-measure';

import { NavContext } from 'components/dialog/context';

import { Position } from 'lib/model/position';
import { useClickContext } from 'lib/hooks/click-outside';

import { PREVIEW_MARGIN, RND_MARGIN } from '../config';
import { getHeight, getPosition } from '../utils';
import { useCalendarState } from '../state';

import styles from './surface.module.scss';

export interface DialogSurfaceProps {
  width: number;
  offset: Position;
  children: ReactNode;
}

export default function DialogSurface({
  width: rndWidth,
  offset,
  children,
}: DialogSurfaceProps): JSX.Element {
  const { editing, setDialog, dragging, setRnd } = useCalendarState();

  const measured = useRef<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  // Remove dialog when dragging an existing meeting. This mimics GCal behavior
  // and prevents awkward loading states shown within the dialog display page.
  useEffect(() => {
    if (editing.id.startsWith('temp')) return;
    setVisible((prev) => prev && !dragging);
  }, [editing.id, dragging]);

  // Only show dialog once it has been measured and positioned accordingly.
  useEffect(() => {
    setTimeout(() => {
      measured.current = true;
      setVisible(true);
    }, 0);
  }, []);

  const [measureRef, bounds] = useMeasure({ polyfill });

  const rndPosition = useMemo(
    () => getPosition(editing.time.from, rndWidth + RND_MARGIN),
    [editing.time.from, rndWidth]
  );
  const rndHeight = useMemo(() => getHeight(editing.time), [editing.time]);

  const onLeft = useMemo(() => {
    const x = offset.x + rndPosition.x - bounds.width - PREVIEW_MARGIN;
    return visible && !dragging ? x : x + 12;
  }, [offset.x, dragging, visible, rndPosition.x, bounds.width]);
  const onRight = useMemo(() => {
    const x = offset.x + rndPosition.x + rndWidth + PREVIEW_MARGIN;
    return visible && !dragging ? x : x - 12;
  }, [offset.x, dragging, visible, rndPosition.x, rndWidth]);

  const alignedTop = useMemo(() => offset.y + rndPosition.y, [
    offset.y,
    rndPosition.y,
  ]);
  const alignedBottom = useMemo(
    () => offset.y + rndPosition.y - bounds.height + rndHeight,
    [offset.y, rndPosition.y, bounds.height, rndHeight]
  );
  const alignedCenter = useMemo(
    () => offset.y + rndPosition.y - 0.5 * (bounds.height - rndHeight),
    [offset.y, rndPosition.y, bounds.height, rndHeight]
  );
  const top = useMemo(() => {
    if (!process.browser) return alignedCenter;
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    if (alignedCenter < 0) return alignedTop;
    if (alignedCenter + bounds.height > vh) return alignedBottom;
    return alignedCenter;
  }, [alignedTop, alignedCenter, alignedBottom, bounds.height]);

  const props = useSpring({
    onRest: () => (!visible && measured.current ? setDialog(false) : undefined),
    left: rndPosition.x < rndWidth * 3 ? onRight : onLeft,
    config: { tension: 250, velocity: 50 },
    immediate: !measured.current || dragging,
    top,
  });

  const { updateEl, removeEl } = useClickContext();
  const clickRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl('meeting-dialog');
      return updateEl('meeting-dialog', node);
    },
    [updateEl, removeEl]
  );

  const navContextValue = useCallback(() => {
    setVisible(false);
    setRnd(false);
  }, [setRnd]);

  return (
    <div className={styles.scrimOuter}>
      <div className={styles.scrimInner}>
        <animated.div
          style={props}
          ref={mergeRefs([measureRef, clickRef])}
          className={cn(styles.wrapper, {
            [styles.visible]: visible && !dragging,
          })}
        >
          <NavContext.Provider value={navContextValue}>
            {children}
          </NavContext.Provider>
        </animated.div>
      </div>
    </div>
  );
}
