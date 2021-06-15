import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios, { AxiosError } from 'axios';
import useSWR, { mutate } from 'swr';
import { Snackbar } from '@rmwc/snackbar';
import { dequal } from 'dequal/lite';
import to from 'await-to-js';

import DialogContent from 'components/dialog';

import { Meeting, MeetingAction, MeetingJSON } from 'lib/model/meeting';
import useClickOutside, { ClickContext } from 'lib/hooks/click-outside';
import { APIErrorJSON } from 'lib/api/error';
import { ListMeetingsRes } from 'lib/api/routes/meetings/list';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { Position } from 'lib/model/position';
import { useOrg } from 'lib/context/org';
import usePeople from 'lib/hooks/people';
import useSingle from 'lib/hooks/single';
import useURLParamSync from 'lib/hooks/url-param-sync';
import { useUser } from 'lib/context/user';

import { CalendarStateContext, DialogPage } from './state';
import CreatePage from './dialog/create-page';
import DialogSurface from './dialog/surface';
import DisplayPage from './dialog/display-page';
import EditPage from './dialog/edit-page';
import FiltersSheet from './filters-sheet';
import Header from './header';
import RecurDialog from './recur-dialog';
import SearchBar from './search-bar';
import WeeklyDisplay from './weekly-display';
import styles from './calendar.module.scss';

const initialEditData = Meeting.parse({});

export interface CalendarProps {
  org?: boolean;
  user?: boolean;
}

export default function Calendar({
  org: byOrg,
  user: byUser,
}: CalendarProps): JSX.Element {
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [mutatedIds, setMutatedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState<MeetingsQuery>(new MeetingsQuery());

  useURLParamSync(query, setQuery, MeetingsQuery, byOrg ? ['org'] : ['people']);

  const { org } = useOrg();
  const { user } = useUser();
  const { data } = useSWR<ListMeetingsRes>(
    (byOrg && query.org) || (byUser && query.people.length)
      ? query.endpoint
      : null,
    {
      revalidateOnFocus: !mutatedIds.size,
      revalidateOnReconnect: !mutatedIds.size,
    }
  );
  const meetings = useMemo(
    () => data?.meetings.map((m) => Meeting.fromJSON(m)) || [],
    [data?.meetings]
  );

  useEffect(() => {
    setQuery((prev) => {
      if (!byOrg || !org || org.id === prev.org) return prev;
      return new MeetingsQuery({ ...prev, org: org.id });
    });
  }, [byOrg, org]);
  useEffect(() => {
    setQuery((prev) => {
      if (!byUser || !user) return prev;
      const people = [{ label: user.name, value: user.id }];
      if (dequal(prev.people, people)) return prev;
      return new MeetingsQuery({ ...prev, people });
    });
  }, [byUser, user]);

  const [rnd, setRnd] = useState<boolean>(false);
  const [dialog, setDialog] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);
  const [dialogPage, setDialogPage] = useState<DialogPage>(DialogPage.Display);
  const [recurDelete, setRecurDelete] = useState<boolean>(false);
  const [recurEdit, setRecurEdit] = useState<boolean>(false);
  const [action, setAction] = useState<MeetingAction>('future');

  // Cancel an unintentional RND drag by simply clicking the "Esc" key.
  // TODO: Perhaps figure out a way to include the dialog closing animation.
  useEffect(() => {
    function onKeyUp(evt: KeyboardEvent) {
      if (!['Esc', 'Escape'].includes(evt.key) && evt.keyCode !== 27) return;
      setDragging(false);
      setDialog(false);
      setRnd(false);
    }
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, []);

  const mutateMeeting = useCallback(
    async (mutated: Meeting, hasBeenUpdated: boolean, sentToAPI: Meeting) => {
      // Don't locally update meetings that have yet to be created.
      if (mutated.id.startsWith('temp')) return;
      setMutatedIds((prev) => {
        const mutatedMeetingIds = new Set(prev);
        if (!hasBeenUpdated) mutatedMeetingIds.add(sentToAPI.id);
        if (hasBeenUpdated) mutatedMeetingIds.delete(sentToAPI.id);
        return mutatedMeetingIds;
      });
      // TODO: Remove meeting if it is no longer within the `query` dates (but
      // note we still want to show the loading indicator in the `Preview`).
      const idx = meetings.findIndex((m) => m.id === sentToAPI.id);
      const updated =
        idx < 0
          ? [...meetings, mutated]
          : [...meetings.slice(0, idx), mutated, ...meetings.slice(idx + 1)];
      if (dequal(updated, meetings)) return;
      // Note: If we ever need to use the `hits` property, we'll have to update
      // this callback function to properly cache and reuse the previous value.
      const json = updated.map((m) => m.toJSON());
      await mutate(query.endpoint, { meetings: json }, hasBeenUpdated);
      // Remove the RND once there is a meeting item to replace it.
      if (idx < 0) setRnd(false);
    },
    [query.endpoint, meetings]
  );

  const original = useRef<Meeting>(initialEditData);
  const updateMeetingRemote = useCallback(
    async (updated: Meeting) => {
      if (updated.id.startsWith('temp')) {
        const { data: createdMeeting } = await axios.post<MeetingJSON>(
          '/api/meetings',
          updated.toJSON()
        );
        return Meeting.fromJSON(createdMeeting);
      }
      const url = `/api/meetings/${updated.id}`;
      const { data: updatedMeeting } = await axios.put<MeetingJSON>(url, {
        ...updated.toJSON(),
        options: { action, original: original.current.toJSON() },
      });
      return Meeting.fromJSON(updatedMeeting);
    },
    [action]
  );

  // TODO: Having a single editing state is good for simplicity and most uses.
  // However, if a user were to drag an RND and then view another meeting while
  // that RND is still updating, we would run into issues...
  const {
    data: editing,
    setData: setEditing,
    onSubmit: onEditSubmit,
    loading: editLoading,
    setLoading: setEditLoading,
    checked: editChecked,
    setChecked: setEditChecked,
    error: editError,
    setError: setEditError,
  } = useSingle<Meeting>(initialEditData, updateMeetingRemote, mutateMeeting);

  const people = usePeople(editing.match);

  // Reset loading/checked/error state when dialog closes so we don't show
  // snackbars for messages already shown in the dialog.
  useEffect(() => {
    if (dialog) return;
    setEditLoading(false);
    setEditChecked(false);
    setEditError('');
  }, [dialog, setEditLoading, setEditChecked, setEditError]);

  // Save the meeting state before an edit so that our back-end can modify recur
  // rules properly (adding the correct `UNTIL` exceptions).
  useEffect(() => {
    if (editing.id !== original.current.id) original.current = editing;
  }, [editing]);

  // Sync the editing state with our SWR meetings state. If a meeting is updated
  // elsewhere, we want the editing state to reflect those updates.
  useEffect(() => {
    setEditing((prev) => {
      if (prev?.id.startsWith('temp')) return prev;
      const idx = meetings.findIndex((m) => m.id === prev?.id);
      if (idx < 0) {
        setDialog(false); // TODO: Animate the dialog closed before removing.
        return prev;
      }
      if (dequal(meetings[idx], prev)) return prev;
      return meetings[idx];
    });
  }, [setEditing, meetings]);

  // TODO: Update offset when the `MDCDialog` adds body scroll lock (which makes
  // the body scrollbar disappear, moving the `fixed` position values).
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const [width, setWidth] = useState<number>(0);

  const onEditStop = useCallback(
    (evt?: FormEvent) => {
      if (evt) evt.preventDefault();
      if (editing.parentId) return setRecurEdit(true);
      return onEditSubmit();
    },
    [editing.parentId, onEditSubmit]
  );

  // TODO: Clicking outside the dialog doesn't animate it closed. Instead, it
  // completely removes the dialog from the React tree (and thus also the DOM).
  // This prevents expensive updates when animating the filter sheet open, but
  // it also gets rid of the nice closing animation...
  const clickContextValue = useClickOutside(() => setDialog(false), dialog);
  const calendarState = useMemo(
    () => ({
      editing,
      setEditing,
      onEditStop,
      rnd,
      setRnd,
      dialog,
      setDialog,
      setDialogPage,
      dragging,
      setDragging,
      start: query.from,
    }),
    [
      editing,
      setEditing,
      onEditStop,
      rnd,
      setRnd,
      dialog,
      setDialog,
      dragging,
      setDragging,
      query.from,
    ]
  );

  const [deleteError, setDeleteError] = useState<string>('');
  const onDeleteSubmit = useCallback(async () => {
    setDeleteError('');
    setEditChecked(false);
    setEditLoading(true);
    const url = `/api/meetings/${editing.parentId || editing.id}`;
    const options = { action, deleting: original.current.toJSON() };
    const [err] = await to(axios.delete(url, { data: { options } }));
    if (err) {
      const e = (err as AxiosError<APIErrorJSON>).response?.data || err;
      setEditLoading(false);
      setDeleteError(e.message);
    } else {
      setEditChecked(true);
      setTimeout(() => {
        const idx = meetings.findIndex((m) => m.id === editing.id);
        if (idx < 0) return;
        const updated = [...meetings.slice(0, idx), ...meetings.slice(idx + 1)];
        const json = updated.map((m) => m.toJSON());
        void mutate(query.endpoint, { meetings: json }, true);
      }, 1000);
    }
  }, [
    setEditLoading,
    setEditChecked,
    query.endpoint,
    meetings,
    editing.parentId,
    editing.id,
    action,
  ]);
  const onDeleteStop = useCallback(
    (evt?: FormEvent) => {
      if (evt) evt.preventDefault();
      if (editing.parentId) return setRecurDelete(true);
      return onDeleteSubmit();
    },
    [editing.parentId, onDeleteSubmit]
  );

  return (
    <CalendarStateContext.Provider value={calendarState}>
      <ClickContext.Provider value={clickContextValue}>
        {!dialog && editLoading && !editChecked && !editError && (
          <Snackbar message='Updating meeting...' timeout={-1} leading open />
        )}
        {!dialog && editChecked && (
          <Snackbar message='Updated meeting.' leading open />
        )}
        {!dialog && editError && (
          <Snackbar
            message='Could not update meeting. Try again later.'
            leading
            open
          />
        )}
        {deleteError && (
          <Snackbar
            message='Could not delete meeting. Try again later'
            leading
            open
          />
        )}
        {(recurEdit || recurDelete) && (
          <RecurDialog
            title={`${recurEdit ? 'Edit' : 'Delete'} recurring meeting`}
            action={action}
            setAction={setAction}
            onClose={(evt) => {
              if (evt.detail.action === 'ok') {
                if (recurEdit) void onEditSubmit();
                if (recurDelete) void onDeleteSubmit();
              } else {
                setEditing(original.current);
              }
            }}
            onClosed={() => {
              setRecurEdit(false);
              setRecurDelete(false);
            }}
          />
        )}
        {dialog && (
          <DialogSurface width={width} offset={offset}>
            <DialogContent page={dialogPage}>
              <DisplayPage
                people={people}
                loading={editLoading}
                checked={editChecked}
                onDeleteStop={onDeleteStop}
              />
              <EditPage
                people={people}
                loading={editLoading}
                checked={editChecked}
                error={editError}
              />
              <CreatePage
                people={people}
                loading={editLoading}
                checked={editChecked}
                error={editError}
              />
            </DialogContent>
          </DialogSurface>
        )}
        <Header query={query} setQuery={setQuery} />
        <div className={styles.wrapper}>
          <SearchBar
            query={query}
            setQuery={setQuery}
            setFiltersOpen={setFiltersOpen}
            byOrg={byOrg}
          />
          <div className={styles.content}>
            <WeeklyDisplay
              searching={!data}
              meetings={meetings}
              filtersOpen={filtersOpen}
              width={width}
              setWidth={setWidth}
              offset={offset}
              setOffset={setOffset}
            />
            <FiltersSheet
              query={query}
              setQuery={setQuery}
              filtersOpen={filtersOpen}
            />
          </div>
        </div>
      </ClickContext.Provider>
    </CalendarStateContext.Provider>
  );
}
