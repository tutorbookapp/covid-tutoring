import { FormEvent, createContext, useContext } from 'react';

import { Callback, CallbackParam } from 'lib/model/callback';
import { Meeting } from 'lib/model/meeting';
import { MeetingsQuery } from 'lib/model/query/meetings';

export interface CalendarState {
  start: Date;
  editing: Meeting;
  setEditing: Callback<Meeting>;
  onEditStop: (evt?: FormEvent) => void;
  rnd: boolean;
  setRnd: Callback<boolean>;
  dialog: boolean;
  setDialog: Callback<boolean>;
  dragging: boolean;
  setDragging: Callback<boolean>;
}

export const CalendarStateContext = createContext<CalendarState>({
  start: new MeetingsQuery().from,
  editing: new Meeting(),
  setEditing: (param: CallbackParam<Meeting>) => {},
  onEditStop: (evt?: FormEvent) => {},
  rnd: false,
  setRnd: (param: CallbackParam<boolean>) => {},
  dialog: false,
  setDialog: (param: CallbackParam<boolean>) => {},
  dragging: false,
  setDragging: (param: CallbackParam<boolean>) => {},
});

export const useCalendarState = (): CalendarState =>
  useContext<CalendarState>(CalendarStateContext);