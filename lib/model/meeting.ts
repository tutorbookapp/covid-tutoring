import * as admin from 'firebase-admin';
import { ObjectWithObjectID } from '@algolia/client-search';

import {
  Match,
  MatchFirestore,
  MatchJSON,
  MatchSearchHit,
  MatchSegment,
  isMatchJSON,
} from 'lib/model/match';
import { Person, isPerson } from 'lib/model/person';
import {
  Resource,
  ResourceFirestore,
  ResourceInterface,
  ResourceJSON,
  ResourceSearchHit,
  isResourceJSON,
} from 'lib/model/resource';
import {
  Timeslot,
  TimeslotFirestore,
  TimeslotJSON,
  TimeslotSearchHit,
  isTimeslotJSON,
} from 'lib/model/timeslot';
import {
  Venue,
  VenueFirestore,
  VenueJSON,
  VenueSearchHit,
  isVenueJSON,
} from 'lib/model/venue';
import { isArray, isJSON } from 'lib/model/json';
import { join, notTags } from 'lib/utils';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

type DocumentSnapshot = admin.firestore.DocumentSnapshot;

export type MeetingTag = 'recurring'; // Meeting is recurring (has rrule).

export type MeetingHitTag = MeetingTag | 'not-recurring';

export const MEETING_TAGS: MeetingTag[] = ['recurring'];

export function isMeetingTag(tag: unknown): tag is MeetingTag {
  return tag === 'recurring';
}

/**
 * @typedef MeetingAction
 * @description Action to take when updating recurring meetings.
 * @property all - Update all of the recurring meetings.
 * @property future - Update this and all future meetings.
 * @property this - Only update this meeting instance.
 */
export type MeetingAction = 'all' | 'future' | 'this';

/**
 * A meeting's status starts as `pending`, becomes `logged` once a tutor or
 * student confirms they've attended the meeting, and finally becomes `approved`
 * once an org admin (or an automation they've setup) approves the logged hours.
 * @typedef MeetingStatus
 * @todo Implement the approval process so that the `approved` status is used.
 */
export type MeetingStatus = 'created' | 'pending' | 'logged' | 'approved';

/**
 * A meeting is a past appointment logged for a match (e.g. John and Jane met
 * last week for 30 mins on Tuesday 3:00 - 3:30 PM).
 * @typedef {Object} Meeting
 * @extends Resource
 * @property status - This meeting's status (i.e. pending, logged, or approved).
 * @property creator - The person who created this meeting.
 * @property match - This meeting's match.
 * @property venue - Link to the meeting venue (e.g. Zoom or Jitsi).
 * @property time - Time of the meeting (e.g. Tuesday 3:00 - 3:30 PM).
 * @property creator - The person who logged the meeting (typically the tutor).
 * @property description - Notes about the meeting (e.g. what they worked on).
 * @property [parentId] - The recurring parent meeting ID (if any).
 */
export interface MeetingInterface extends ResourceInterface {
  status: MeetingStatus;
  creator: Person;
  match: Match;
  venue: Venue;
  time: Timeslot;
  description: string;
  tags: MeetingTag[];
  parentId?: string;
  id: string;
}

export type MeetingJSON = Omit<
  MeetingInterface,
  keyof Resource | 'time' | 'venue' | 'match'
> &
  ResourceJSON & { time: TimeslotJSON; venue: VenueJSON; match: MatchJSON };
export type MeetingFirestore = Omit<
  MeetingInterface,
  keyof Resource | 'time' | 'venue' | 'match'
> &
  ResourceFirestore & {
    time: TimeslotFirestore;
    venue: VenueFirestore;
    match: MatchFirestore;
  };
export type MeetingSearchHit = ObjectWithObjectID &
  Omit<
    MeetingInterface,
    keyof Resource | 'time' | 'venue' | 'match' | 'id' | 'tags'
  > &
  ResourceSearchHit & {
    time: TimeslotSearchHit;
    venue: VenueSearchHit;
    match: MatchSearchHit;
    _tags: MeetingHitTag[];
  };

export interface MeetingSegment {
  id: string;
  description: string;
  start: Date;
  end: Date;
  match: MatchSegment;
}

export function isMeetingJSON(json: unknown): json is MeetingJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.status !== 'string') return false;
  if (!['created', 'pending', 'logged', 'approved'].includes(json.status))
    return false;
  if (!isPerson(json.creator)) return false;
  if (!isMatchJSON(json.match)) return false;
  if (!isVenueJSON(json.venue)) return false;
  if (!isTimeslotJSON(json.time)) return false;
  if (typeof json.description !== 'string') return false;
  if (!isArray(json.tags, isMeetingTag)) return false;
  if (json.parentId && typeof json.parentId !== 'string') return false;
  if (typeof json.id !== 'string') return false;
  return true;
}

export class Meeting extends Resource implements MeetingInterface {
  public status: MeetingStatus = 'pending';

  public creator: Person = {
    id: '',
    name: '',
    photo: '',
    roles: [],
  };

  public match = new Match();

  public venue = new Venue();

  public time = new Timeslot();

  public description = '';

  public tags: MeetingTag[] = [];

  public parentId?: string;

  public id = '';

  public constructor(meeting: Partial<MeetingInterface> = {}) {
    super(meeting);
    construct<MeetingInterface, ResourceInterface>(
      this,
      meeting,
      new Resource()
    );
  }

  public get clone(): Meeting {
    return new Meeting(clone(this));
  }

  public toString(): string {
    return `Meeting on ${this.time.toString()}`;
  }

  public toJSON(): MeetingJSON {
    const { time, venue, match, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toJSON(),
      time: time.toJSON(),
      venue: venue.toJSON(),
      match: match.toJSON(),
    });
  }

  public static fromJSON({
    time,
    venue,
    match,
    ...rest
  }: MeetingJSON): Meeting {
    return new Meeting({
      ...rest,
      ...Resource.fromJSON(rest),
      time: Timeslot.fromJSON(time),
      venue: Venue.fromJSON(venue),
      match: Match.fromJSON(match),
    });
  }

  public toFirestore(): MeetingFirestore {
    const { time, venue, match, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toFirestore(),
      time: time.toFirestore(),
      venue: venue.toFirestore(),
      match: match.toFirestore(),
    });
  }

  public static fromFirestore({
    time,
    venue,
    match,
    ...rest
  }: MeetingFirestore): Meeting {
    return new Meeting({
      ...rest,
      ...Resource.fromFirestore(rest),
      time: Timeslot.fromFirestore(time),
      venue: Venue.fromFirestore(venue),
      match: Match.fromFirestore(match),
    });
  }

  public static fromFirestoreDoc(snapshot: DocumentSnapshot): Meeting {
    if (!snapshot.exists) return new Meeting();
    const overrides = definedVals({
      created: snapshot.createTime?.toDate(),
      updated: snapshot.updateTime?.toDate(),
      id: snapshot.id,
    });
    const meeting = Meeting.fromFirestore(snapshot.data() as MeetingFirestore);
    return new Meeting({ ...meeting, ...overrides });
  }

  public toSearchHit(): MeetingSearchHit {
    const { time, venue, match, tags, id, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toSearchHit(),
      time: time.toSearchHit(),
      venue: venue.toSearchHit(),
      match: match.toSearchHit(),
      _tags: [...tags, ...notTags(tags, MEETING_TAGS)],
      tags: undefined,
      id: undefined,
      objectID: id,
    });
  }

  public static fromSearchHit({
    time,
    venue,
    match,
    _tags = [],
    objectID,
    ...rest
  }: MeetingSearchHit): Meeting {
    return new Meeting({
      ...rest,
      ...Resource.fromSearchHit(rest),
      time: Timeslot.fromSearchHit(time),
      venue: Venue.fromSearchHit(venue),
      match: Match.fromSearchHit(match),
      tags: _tags.filter(isMeetingTag),
      id: objectID,
    });
  }

  public toCSV(): Record<string, string> {
    return {
      'Meeting ID': this.id,
      'Meeting Description': this.description,
      'Meeting Start': this.time.from.toString(),
      'Meeting End': this.time.to.toString(),
      'Meeting Tags': join(this.tags),
      'Meeting Created': this.created.toString(),
      'Meeting Last Updated': this.updated.toString(),
      ...this.match.toCSV(),
    };
  }

  public toSegment(): MeetingSegment {
    return {
      id: this.id,
      description: this.description,
      start: this.time.from,
      end: this.time.to,
      match: this.match.toSegment(),
    };
  }
}
