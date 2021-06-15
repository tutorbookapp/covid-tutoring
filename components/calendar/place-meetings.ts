import { Meeting } from 'lib/model';

// Expands events at the far right to use up any remaining
// space. Returns the number of columns the event can
// expand into, without colliding with other events.
export function expand(e: Meeting, colIdx: number, cols: Meeting[][]): number {
  let colSpan = 1;
  cols.slice(colIdx + 1).some((col) => {
    if (col.some((evt) => e.time.overlaps(evt.time, true))) return true;
    colSpan += 1;
    return false;
  });
  return colSpan;
}

// Place concurrent meetings side-by-side (like GCal).
// @see {@link https://share.clickup.com/t/h/hpxh7u/WQO1OW4DQN0SIZD}
// @see {@link https://stackoverflow.com/a/11323909/10023158}
// @see {@link https://jsbin.com/detefuveta/edit}
export function placeMeetings(meetings: Meeting[]): Meeting[][][][] {
  const COLS = Array(7).fill(null);
  // Each day contains the groups that are on that day.
  return COLS.map((_, day) => {
    // Each group contains columns of events that overlap.
    const groups: Meeting[][][] = [];
    // Each column contains events that do not overlap.
    let columns: Meeting[][] = [];
    let lastEventEnding: Date | undefined;
    // Place each event into a column within an event group.
    meetings
      .filter((m) => m.time.from.getDay() === day)
      .sort(({ time: e1 }, { time: e2 }) => {
        if (e1.from < e2.from) return -1;
        if (e1.from > e2.from) return 1;
        if (e1.to < e2.to) return -1;
        if (e1.to > e2.to) return 1;
        return 0;
      })
      .forEach((e) => {
        // Check if a new event group needs to be started.
        if (lastEventEnding && e.time.from >= lastEventEnding) {
          // The event is later than any of the events in the
          // current group. There is no overlap. Output the
          // current event group and start a new one.
          groups.push(columns);
          columns = [];
          lastEventEnding = undefined;
        }

        // Try to place the event inside an existing column.
        let placed = false;
        columns.some((col) => {
          if (!col[col.length - 1].time.overlaps(e.time, true)) {
            col.push(e);
            placed = true;
          }
          return placed;
        });

        // It was not possible to place the event (it overlaps
        // with events in each existing column). Add a new column
        // to the current event group with the event in it.
        if (!placed) columns.push([e]);

        // Remember the last event end time of the current group.
        if (!lastEventEnding || e.time.to > lastEventEnding)
          lastEventEnding = e.time.to;
      });
    return [...groups, columns];
  });
}
