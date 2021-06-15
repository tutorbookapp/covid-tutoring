import * as admin from 'firebase-admin';
import { ObjectWithObjectID } from '@algolia/client-search';

import {
  Resource,
  ResourceFirestore,
  ResourceInterface,
  ResourceJSON,
  ResourceSearchHit,
} from 'lib/model/resource';
import { MatchTag } from 'lib/model/match';
import { MeetingTag } from 'lib/model/meeting';
import { Role } from 'lib/model/person';
import { UserTag } from 'lib/model/user';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

type DocumentSnapshot = admin.firestore.DocumentSnapshot;
type Timestamp = admin.firestore.Timestamp;

/**
 * @typedef {Object} TagTotals
 * @description We collect totals based on data model tags. Because they're
 * filterable tags, org admins can then filter and see what's in these totals.
 */
export type TagTotals<Tag extends string> = { total: number } & {
  [key in Tag]: number;
};

/**
 * @typedef {Object} Analytics
 * @extends Resource
 * @description A day of org analytics. Created when the first even triggers and
 * is updated until 24 hours have passed (and a new analytics doc is created).
 */
export interface AnalyticsInterface extends ResourceInterface {
  tutor: TagTotals<Exclude<UserTag, Role>>;
  tutee: TagTotals<Exclude<UserTag, Role>>;
  mentor: TagTotals<Exclude<UserTag, Role>>;
  mentee: TagTotals<Exclude<UserTag, Role>>;
  parent: TagTotals<Exclude<UserTag, Role>>;
  match: TagTotals<MatchTag>;
  meeting: TagTotals<MeetingTag>;
  date: Date;
  id: string;
}

export type AnalyticsJSON = Omit<AnalyticsInterface, keyof Resource | 'date'> &
  ResourceJSON & { date: string };
export type AnalyticsSearchHit = ObjectWithObjectID &
  Omit<AnalyticsInterface, keyof Resource | 'id' | 'date'> &
  ResourceSearchHit & { date: number };
export type AnalyticsFirestore = Omit<
  AnalyticsInterface,
  keyof Resource | 'date'
> &
  ResourceFirestore & { date: Timestamp };

export class Analytics extends Resource implements AnalyticsInterface {
  public tutor: TagTotals<Exclude<UserTag, Role>> = {
    total: 0,
    vetted: 0,
    matched: 0,
    meeting: 0,
  };

  public tutee: TagTotals<Exclude<UserTag, Role>> = {
    total: 0,
    vetted: 0,
    matched: 0,
    meeting: 0,
  };

  public mentor: TagTotals<Exclude<UserTag, Role>> = {
    total: 0,
    vetted: 0,
    matched: 0,
    meeting: 0,
  };

  public mentee: TagTotals<Exclude<UserTag, Role>> = {
    total: 0,
    vetted: 0,
    matched: 0,
    meeting: 0,
  };

  public parent: TagTotals<Exclude<UserTag, Role>> = {
    total: 0,
    vetted: 0,
    matched: 0,
    meeting: 0,
  };

  public match: TagTotals<MatchTag> = { total: 0, meeting: 0 };

  public meeting: TagTotals<MeetingTag> = { total: 0, recurring: 0 };

  public date: Date = new Date();

  public id = '';

  public constructor(match: Partial<AnalyticsInterface> = {}) {
    super(match);
    construct<AnalyticsInterface, ResourceInterface>(
      this,
      match,
      new Resource()
    );
  }

  public get volunteer(): TagTotals<Exclude<UserTag, Role>> {
    return {
      total: this.mentor.total + this.tutor.total,
      vetted: this.mentor.vetted + this.tutor.vetted,
      matched: this.mentor.matched + this.tutor.matched,
      meeting: this.mentor.meeting + this.tutor.meeting,
    };
  }

  public get student(): TagTotals<Exclude<UserTag, Role>> {
    return {
      total: this.mentee.total + this.tutee.total,
      vetted: this.mentee.vetted + this.tutee.vetted,
      matched: this.mentee.matched + this.tutee.matched,
      meeting: this.mentee.meeting + this.tutee.meeting,
    };
  }

  public get clone(): Analytics {
    return new Analytics(clone(this));
  }

  public toJSON(): AnalyticsJSON {
    const { date, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toJSON(),
      date: date.toJSON(),
    });
  }

  public static fromJSON({ date, ...rest }: AnalyticsJSON): Analytics {
    return new Analytics({
      ...rest,
      ...Resource.fromJSON(rest),
      date: new Date(date),
    });
  }

  public toFirestore(): AnalyticsFirestore {
    const { date, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toFirestore(),
      date: (date as unknown) as Timestamp,
    });
  }

  public static fromFirestore({
    date,
    ...rest
  }: AnalyticsFirestore): Analytics {
    return new Analytics({
      ...rest,
      ...Resource.fromFirestore(rest),
      date: date.toDate(),
    });
  }

  public static fromFirestoreDoc(snapshot: DocumentSnapshot): Analytics {
    if (!snapshot.exists) return new Analytics();
    const overrides = definedVals({
      created: snapshot.createTime?.toDate(),
      updated: snapshot.updateTime?.toDate(),
      id: snapshot.id,
    });
    const match = Analytics.fromFirestore(
      snapshot.data() as AnalyticsFirestore
    );
    return new Analytics({ ...match, ...overrides });
  }

  public toSearchHit(): AnalyticsSearchHit {
    const { id, date, ...rest } = this;
    return definedVals({
      ...rest,
      ...super.toSearchHit(),
      date: date.valueOf(),
      id: undefined,
      objectID: id,
    });
  }

  public static fromSearchHit({
    objectID,
    date,
    ...rest
  }: AnalyticsSearchHit): Analytics {
    return new Analytics({
      ...rest,
      ...Resource.fromSearchHit(rest),
      date: new Date(date),
      id: objectID,
    });
  }
}
