import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogContent,
  DialogOnCloseEventT,
  DialogTitle,
} from '@rmwc/dialog';
import { FormEvent, useCallback } from 'react';
import { Radio } from '@rmwc/radio';

import { Callback } from 'lib/model/callback';
import { MeetingAction } from 'lib/model/meeting';
import { useClickContext } from 'lib/hooks/click-outside';

import styles from './recur-dialog.module.scss';

export interface RecurDialogProps {
  title: string;
  action: MeetingAction;
  setAction: Callback<MeetingAction>;
  onClose: (evt: DialogOnCloseEventT) => void;
  onClosed: (evt: DialogOnCloseEventT) => void;
}

export default function RecurDialog({
  title,
  action,
  setAction,
  onClose,
  onClosed,
}: RecurDialogProps): JSX.Element {
  const { updateEl, removeEl } = useClickContext();
  const clickRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl('recur-dialog');
      return updateEl('recur-dialog', node);
    },
    [updateEl, removeEl]
  );
  const onChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      setAction(evt.currentTarget.value as MeetingAction);
    },
    [setAction]
  );

  return (
    <Dialog
      open
      ref={clickRef}
      onClose={onClose}
      onClosed={onClosed}
      className={styles.dialog}
    >
      <DialogTitle className={styles.title}>{title}</DialogTitle>
      <DialogContent className={styles.content}>
        <Radio
          value='this'
          onChange={onChange}
          className={styles.radio}
          checked={action === 'this'}
        >
          This meeting
        </Radio>
        <Radio
          value='future'
          onChange={onChange}
          className={styles.radio}
          checked={action === 'future'}
        >
          This and following meetings
        </Radio>
        <Radio
          value='all'
          onChange={onChange}
          className={styles.radio}
          checked={action === 'all'}
        >
          All meetings
        </Radio>
      </DialogContent>
      <DialogActions>
        <DialogButton action='cancel'>Cancel</DialogButton>
        <DialogButton action='ok' isDefaultAction>
          OK
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}
