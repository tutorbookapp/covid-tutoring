import { useCallback, useMemo } from 'react';
import cn from 'classnames';

import { Meeting } from 'lib/model';
import { Position } from 'lib/model';
import { TCallback } from 'lib/model';
import { useClickContext } from 'lib/hooks/click-outside';

import { DialogPage, useCalendarState } from '../state';
import { MouseEventHackData, MouseEventHackTarget } from '../hack-types';
import { getHeight, getPosition } from '../utils';

import MeetingContent from './content';
import styles from './item.module.scss';

export interface MeetingItemProps {
  now: Date;
  meeting: Meeting;
  leftPercent: number;
  widthPercent: number;
  setEventData: TCallback<MouseEventHackData>;
  setEventTarget: TCallback<MouseEventHackTarget>;
}

export default function MeetingItem({
  now,
  meeting,
  leftPercent,
  widthPercent,
  setEventData,
  setEventTarget,
}: MeetingItemProps): JSX.Element {
  const top = useMemo(() => getPosition(meeting.time.from).y, [
    meeting.time.from,
  ]);
  const left = useMemo(() => {
    if (leftPercent === 0) return '-1px';
    return `calc(${leftPercent * 100}% + 1px)`;
  }, [leftPercent]);
  const width = useMemo(() => {
    if (leftPercent === 0) return `calc(${widthPercent * 100}% + 1px)`;
    return `calc(${widthPercent * 100}% - 1px)`;
  }, [leftPercent, widthPercent]);
  const height = useMemo(() => getHeight(meeting.time), [meeting.time]);

  const { updateEl, removeEl } = useClickContext();
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl(`meeting-item-${meeting.id}`);
      return updateEl(`meeting-item-${meeting.id}`, node);
    },
    [updateEl, removeEl, meeting.id]
  );

  const {
    editing,
    setEditing,
    rnd,
    setRnd,
    dialog,
    setDialog,
    setDialogPage,
  } = useCalendarState();

  return (
    <div
      style={{ top, left, width, height }}
      className={cn(styles.meeting, {
        [styles.elevated]: !rnd && dialog && editing.id === meeting.id,
        [styles.editing]: rnd && editing.id === meeting.id,
        [styles.past]: meeting.time.to <= now,
      })}
      onClick={(evt) => evt.stopPropagation()}
      onMouseDown={(evt) => {
        evt.stopPropagation();

        // Decide what to do after mousedown:
        // - If mousemove more than 10px, then edit with RND (this is a drag).
        // - If mouseup, then view (this is a click).
        let mouseMovement = 0;
        let lastPosition: Position;
        const edit = (e: MouseEvent) => {
          e.stopPropagation();
          if (lastPosition)
            mouseMovement += Math.sqrt(
              Math.pow(lastPosition.x - e.clientX, 2) +
                Math.pow(lastPosition.y - e.clientY, 2)
            );
          lastPosition = { x: e.clientX, y: e.clientY };
          if (mouseMovement > 10) {
            removeListeners();
            setEditing(meeting);
            setEventTarget('middle');
            setEventData({
              screenX: e.screenX,
              screenY: e.screenY,
              clientX: e.clientX,
              clientY: e.clientY,
              button: e.button,
              buttons: e.buttons,
            });
            setRnd(true);
          }
        };
        const view = (e: MouseEvent) => {
          e.stopPropagation();
          removeListeners();
          setRnd(false);
          setEditing(meeting);
          setDialogPage(DialogPage.Display);
          setDialog(true);
        };
        const removeListeners = () => {
          document.removeEventListener('mousemove', edit, { capture: true });
          document.removeEventListener('mouseup', view, { capture: true });
        };

        document.addEventListener('mousemove', edit, { capture: true });
        document.addEventListener('mouseup', view, { capture: true });
      }}
    >
      <MeetingContent ref={ref} meeting={meeting} height={height} />
      <span>
        <div
          className={styles.bottom}
          onMouseDown={(evt) => {
            evt.stopPropagation();
            setEditing(meeting);
            setEventTarget('bottom');
            setEventData({
              screenX: evt.screenX,
              screenY: evt.screenY,
              clientX: evt.clientX,
              clientY: evt.clientY,
              button: evt.button,
              buttons: evt.buttons,
            });
            setRnd(true);
          }}
        />
        <div
          className={styles.top}
          onMouseDown={(evt) => {
            evt.stopPropagation();
            setEditing(meeting);
            setEventTarget('top');
            setEventData({
              screenX: evt.screenX,
              screenY: evt.screenY,
              clientX: evt.clientX,
              clientY: evt.clientY,
              button: evt.button,
              buttons: evt.buttons,
            });
            setRnd(true);
          }}
        />
      </span>
    </div>
  );
}
