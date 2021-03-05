import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Snackbar } from '@rmwc/snackbar';
import axios from 'axios';
import { dequal } from 'dequal/lite';

import DialogContent from 'components/dialog';

import { Meeting, MeetingJSON } from 'lib/model/meeting';
import useClickOutside, { ClickContext } from 'lib/hooks/click-outside';
import { ListMeetingsRes } from 'lib/api/routes/meetings/list';
import { MeetingsQuery } from 'lib/model/query/meetings';
import { Position } from 'lib/model/position';
import { useOrg } from 'lib/context/org';
import usePeople from 'lib/hooks/people';
import useSingle from 'lib/hooks/single';
import { useUser } from 'lib/context/user';

import { CalendarStateContext } from './state';
import CreatePage from './dialog/create-page';
import DialogSurface from './dialog/surface';
import DisplayPage from './dialog/display-page';
import EditPage from './dialog/edit-page';
import FiltersSheet from './filters-sheet';
import Header from './header';
import SearchBar from './search-bar';
import WeeklyDisplay from './weekly-display';
import styles from './calendar.module.scss';

const initialEditData = new Meeting();

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
  const [query, setQuery] = useState<MeetingsQuery>(
    new MeetingsQuery({ hitsPerPage: 1000 })
  );

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
  const [dialogPage, setDialogPage] = useState<number>(0);

  const mutateMeeting = useCallback(
    async (mutated: Meeting, hasBeenUpdated = false) => {
      // Don't locally update meetings that have yet to be created.
      if (mutated.id.startsWith('temp')) return;
      setMutatedIds((prev) => {
        const mutatedMeetingIds = new Set(prev);
        if (!hasBeenUpdated) mutatedMeetingIds.add(mutated.id);
        if (hasBeenUpdated) mutatedMeetingIds.delete(mutated.id);
        if (dequal([...mutatedMeetingIds], [...prev])) return prev;
        return mutatedMeetingIds;
      });
      // TODO: Remove meeting if it is no longer within the `query` dates (but
      // note we still want to show the loading indicator in the `Preview`).
      const idx = meetings.findIndex((m) => m.id === mutated.id);
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
  const updateMeetingRemote = useCallback(async (updated: Meeting) => {
    if (updated.id.startsWith('temp')) {
      const url = '/api/meetings';
      const { data: createdMeeting } = await axios.post<MeetingJSON>(
        url,
        updated.toJSON()
      );
      return Meeting.fromJSON(createdMeeting);
    }
    const url = `/api/meetings/${updated.id}`;
    const { data: updatedMeeting } = await axios.put<MeetingJSON>(url, {
      ...updated.toJSON(),
      options: { original: original.current.toJSON() },
    });
    return Meeting.fromJSON(updatedMeeting);
  }, []);

  // TODO: Having a single editing state is good for simplicity and most uses.
  // However, if a user were to drag an RND and then view another meeting while
  // that RND is still updating, we would run into issues...
  const {
    data: editing,
    setData: setEditing,
    onSubmit: onEditStop,
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

  // Open to the correct dialog page when viewing/creating different meetings.
  useEffect(() => {
    if (editing.id.startsWith('temp')) {
      setDialogPage(2);
    } else {
      setDialogPage(0);
    }
  }, [editing.id]);

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

  const [width, setWidth] = useState<number>(0);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });

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
        {dialog && (
          <DialogSurface width={width} offset={offset}>
            <DialogContent page={dialogPage}>
              <DisplayPage
                people={people}
                setPage={setDialogPage}
                loading={editLoading}
                checked={editChecked}
              />
              <EditPage
                people={people}
                setPage={setDialogPage}
                loading={editLoading}
                checked={editChecked}
                error={editError}
              />
              <CreatePage
                people={people}
                setPage={setDialogPage}
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
