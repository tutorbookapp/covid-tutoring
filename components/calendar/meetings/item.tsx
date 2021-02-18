import cn from 'classnames';
import { useMemo } from 'react';

import { Meeting, TCallback } from 'lib/model';

import { MouseEventHackData, MouseEventHackTarget } from '../hack-types';
import { getHeight, getPosition } from '../utils';

import MeetingContent from './content';
import styles from './item.module.scss';

export interface MeetingItemProps {
  now: Date;
  meeting: Meeting;
  leftPercent: number;
  widthPercent: number;
  viewing?: Meeting;
  setViewing: TCallback<Meeting>;
  editing?: Meeting;
  setEditing: TCallback<Meeting>;
  editRndVisible: boolean;
  setEditRndVisible: TCallback<boolean>;
  setEventData: TCallback<MouseEventHackData>;
  setEventTarget: TCallback<MouseEventHackTarget>;
}

export default function MeetingItem({
  now,
  meeting,
  leftPercent,
  widthPercent,
  viewing,
  setViewing,
  editing,
  setEditing,
  editRndVisible,
  setEditRndVisible,
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

  return (
    <div
      style={{ top, left, width, height }}
      className={cn(styles.meeting, {
        [styles.elevated]: !editRndVisible && viewing?.id === meeting.id,
        [styles.editing]: editRndVisible && editing?.id === meeting.id,
        [styles.past]: meeting.time.to <= now,
      })}
      onMouseDown={(evt) => {
        evt.stopPropagation();

        // Decide what to do after mousedown:
        // - If mousemove, then edit with RND (this is a drag).
        // - If mouseup, then view (this is a click).
        const edit = (evt: MouseEvent) => {
          removeListeners();
          setEditing(meeting);
          setEventTarget('middle');
          setEventData({
            screenX: evt.screenX,
            screenY: evt.screenY,
            clientX: evt.clientX,
            clientY: evt.clientY,
            button: evt.button,
            buttons: evt.buttons,
          });
          setEditRndVisible(true);
        };
        const view = () => {
          removeListeners();
          setViewing(meeting);
        };
        const removeListeners = () => {
          document.removeEventListener('mousemove', edit, { capture: true });
          document.removeEventListener('mouseup', view, { capture: true });
        };

        document.addEventListener('mousemove', edit, { capture: true });
        document.addEventListener('mouseup', view, { capture: true });
      }}
    >
      <MeetingContent meeting={meeting} height={height} />
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
            setEditRndVisible(true);
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
            setEditRndVisible(true);
          }}
        />
      </span>
    </div>
  );
}
