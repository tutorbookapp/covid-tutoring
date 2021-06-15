import { FormEvent, createContext, useContext } from 'react';

import { Callback, CallbackParam } from 'lib/model/callback';
import { Meeting } from 'lib/model/meeting';
import { MeetingsQuery } from 'lib/model/query/meetings';

export enum DialogPage {
  Display = 0,
  Edit,
  Create,
}

export interface CalendarState {
  start: Date;
  editing: Meeting;
  setEditing: Callback<Meeting>;
  onEditStop: (evt?: FormEvent) => void;
  rnd: boolean;
  setRnd: Callback<boolean>;
  dialog: boolean;
  setDialog: Callback<boolean>;
  setDialogPage: Callback<DialogPage>;
  dragging: boolean;
  setDragging: Callback<boolean>;
}

export const CalendarStateContext = createContext<CalendarState>({
  start: MeetingsQuery.parse({}).from,
  editing: Meeting.parse({}),
  setEditing: (param: CallbackParam<Meeting>) => {},
  onEditStop: (evt?: FormEvent) => {},
  rnd: false,
  setRnd: (param: CallbackParam<boolean>) => {},
  dialog: false,
  setDialog: (param: CallbackParam<boolean>) => {},
  setDialogPage: (param: CallbackParam<DialogPage>) => {},
  dragging: false,
  setDragging: (param: CallbackParam<boolean>) => {},
});

export const useCalendarState = (): CalendarState =>
  useContext<CalendarState>(CalendarStateContext);
