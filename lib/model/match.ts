import * as admin from 'firebase-admin';
import { ObjectWithObjectID } from '@algolia/client-search';

import { Person, isPerson } from 'lib/model/person';
import {
  Resource,
  ResourceFirestore,
  ResourceInterface,
  ResourceJSON,
  ResourceSearchHit,
  isResourceJSON,
} from 'lib/model/resource';
import { isArray, isJSON } from 'lib/model/json';
import { join, notTags } from 'lib/utils';
import { Aspect } from 'lib/model/aspect';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

type DocumentSnapshot = admin.firestore.DocumentSnapshot;

export type MatchTag = 'meeting'; // Match has at least one meeting.

export type MatchHitTag = MatchTag | 'not-meeting';

export const MATCH_TAGS: MatchTag[] = ['meeting'];

export function isMatchTag(tag: unknown): tag is MatchTag {
  return tag === 'meeting';
}

/**
 * Represents a tutoring lesson or mentoring appointment.
 * @typedef {Object} MatchInterface
 * @property org - The ID of the organization that owns this request or match.
 * @property subjects - The subjects that this match is about (e.g. AP CS).
 * @property people - The people involved in this match (i.e. pupil and tutor).
 * @property creator - The person who created this match (e.g. pupil or admin).
 * @property message - A more detailed description of this match or request.
 */
export interface MatchInterface extends ResourceInterface {
  org: string;
  subjects: string[];
  people: Person[];
  creator: Person;
  message: string;
  tags: MatchTag[];
  id: string;
}

export type MatchJSON = Omit<MatchInterface, keyof Resource> & ResourceJSON;
export type MatchSearchHit = ObjectWithObjectID &
  Omit<MatchInterface, keyof Resource | 'id' | 'tags'> &
  ResourceSearchHit & { _tags: MatchHitTag[] };
export type MatchFirestore = Omit<MatchInterface, keyof Resource> &
  ResourceFirestore;

export interface MatchSegment {
  id: string;
  message: string;
  subjects: string[];
}

export function isMatchJSON(json: unknown): json is MatchJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.org !== 'string') return false;
  if (!(json.subjects instanceof Array)) return false;
  if (json.subjects.some((s) => typeof s !== 'string')) return false;
  if (!(json.people instanceof Array)) return false;
  if (json.people.some((p) => !isPerson(p))) return false;
  if (!isPerson(json.creator)) return false;
  if (typeof json.message !== 'string') return false;
  if (!isArray(json.tags, isMatchTag)) return false;
  if (typeof json.id !== 'string') return false;
  return true;
}

export class Match extends Resource implements MatchInterface {
  public org = 'default';

  public subjects: string[] = [];

  public people: Person[] = [];

  public creator: Person = {
    id: '',
    name: '',
    photo: '',
    roles: [],
  };

  public message = '';

  public tags: MatchTag[] = [];

  public id = '';

  public constructor(match: Partial<MatchInterface> = {}) {
    super(match);
    construct<MatchInterface, ResourceInterface>(this, match, new Resource());
  }

  public get clone(): Match {
    return new Match(clone(this));
  }

  public get aspect(): Aspect {
    const isTutor = (a: Person) => a.roles.indexOf('tutor') >= 0;
    const isTutee = (a: Person) => a.roles.indexOf('tutee') >= 0;
    if (this.people.some((a) => isTutor(a) || isTutee(a))) return 'tutoring';
    return 'mentoring';
  }

  public get volunteer(): Person | undefined {
    return this.people.find(
      (p) => p.roles.includes('tutor') || p.roles.includes('mentor')
    );
  }

  public get student(): Person | undefined {
    return this.people.find(
      (p) => p.roles.includes('tutee') || p.roles.includes('mentee')
    );
  }

  public toString(): string {
    return `Match for ${join(this.subjects) || 'No Subjects'}`;
  }

  public toJSON(): MatchJSON {
    return definedVals({ ...this, ...super.toJSON() });
  }

  public static fromJSON(json: MatchJSON): Match {
    return new Match({ ...json, ...Resource.fromJSON(json) });
  }

  public toFirestore(): MatchFirestore {
    return definedVals({ ...this, ...super.toFirestore() });
  }

  public static fromFirestore(data: MatchFirestore): Match {
    return new Match({ ...data, ...Resource.fromFirestore(data) });
  }

  public static fromFirestoreDoc(snapshot: DocumentSnapshot): Match {
    if (!snapshot.exists) return new Match();
    const overrides = definedVals({
      created: snapshot.createTime?.toDate(),
      updated: snapshot.updateTime?.toDate(),
      id: snapshot.id,
    });
    const match = Match.fromFirestore(snapshot.data() as MatchFirestore);
    return new Match({ ...match, ...overrides });
  }

  public toSearchHit(): MatchSearchHit {
    const { tags, id, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toSearchHit(),
      _tags: [...tags, ...notTags(tags, MATCH_TAGS)],
      tags: undefined,
      id: undefined,
      objectID: id,
    });
  }

  public static fromSearchHit({
    _tags = [],
    objectID,
    ...hit
  }: MatchSearchHit): Match {
    return new Match({
      ...hit,
      ...Resource.fromSearchHit(hit),
      tags: _tags.filter(isMatchTag),
      id: objectID,
    });
  }

  public toCSV(): Record<string, string> {
    return {
      'Match ID': this.id,
      'Match Subjects': join(this.subjects),
      'Match Message': this.message,
      'Match Tags': join(this.tags),
      'Match Created': this.created.toString(),
      'Match Last Updated': this.updated.toString(),
      'Volunteer ID': this.volunteer?.id || '',
      'Volunteer Name': this.volunteer?.name || '',
      'Volunteer Photo URL': this.volunteer?.photo || '',
      'Student ID': this.student?.id || '',
      'Student Name': this.student?.name || '',
      'Student Photo URL': this.student?.photo || '',
    };
  }

  public toSegment(): MatchSegment {
    return { id: this.id, message: this.message, subjects: this.subjects };
  }
}
