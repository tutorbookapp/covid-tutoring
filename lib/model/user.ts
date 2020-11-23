import * as admin from 'firebase-admin';
import { ObjectWithObjectID } from '@algolia/client-search';
import { v4 as uuid } from 'uuid';

import {
  Account,
  AccountInterface,
  AccountJSON,
  isAccountJSON,
} from 'lib/model/account';
import { Aspect, isAspect } from 'lib/model/aspect';
import {
  Availability,
  AvailabilityJSON,
  AvailabilitySearchHit,
  isAvailabilityJSON,
} from 'lib/model/availability';
import { Person, Role } from 'lib/model/person';
import {
  Verification,
  VerificationJSON,
  VerificationSearchHit,
  isVerificationJSON,
  verificationsFromFirestore,
} from 'lib/model/verification';
import {
  ZoomUser,
  ZoomUserJSON,
  ZoomUserSearchHit,
  isZoomUserJSON,
  zoomsFromFirestore,
} from 'lib/model/zoom-user';
import { isArray, isJSON, isStringArray } from 'lib/model/json';
import construct from 'lib/model/construct';
import firestoreVals from 'lib/model/firestore-vals';

type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot;

/**
 * Right now, we only support traditional K-12 grade levels (e.g. 'Freshman'
 * maps to the number 9).
 * @todo Perhaps support other grade levels and other educational systems (e.g.
 * research how other countries do grade levels).
 */
export type GradeAlias = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Subjects = { subjects: string[]; searches: string[] };

export function isSubjects(json: unknown): json is Subjects {
  if (!isJSON(json)) return false;
  if (!isStringArray(json.subjects)) return false;
  if (!isStringArray(json.searches)) return false;
  return true;
}

/**
 * Various tags that are added to the Algolia users search during indexing (via
 * the `firebase/functions/src/algolia.ts` GCP serverless function).
 */
export type Tag = 'not-vetted';

/**
 * A user object (that is stored in their Firestore profile document by uID).
 * @typedef {Object} UserInterface
 * @extends AccountInterface
 * @property orgs - An array of the IDs of the orgs this user belongs to.
 * @property zooms - An array of Zoom user accounts. These are used when
 * creating Zoom meetings for a match. Each TB user can have multiple Zoom user
 * accounts managed by different orgs; we use the Zoom account belonging to the
 * org that owns the match when creating Zoom meetings for said match.
 * @property availability - An array of `Timeslot`'s when the user is free.
 * @property mentoring - The subjects that the user wants a and can mentor for.
 * @property tutoring - The subjects that the user wants a and can tutor for.
 * @property langs - The languages (as ISO codes) the user can speak fluently.
 * @property parents - The Firebase uIDs of linked parent accounts.
 * @property visible - Whether or not this user appears in search results.
 * @property featured - Aspects in which this user is first in search results.
 * @property [token] - The user's Firebase Authentication JWT `idToken`.
 * @property [hash] - The user's Intercom HMAC for identity verifications.
 * @todo Add a `zoom` prop that contains the user's personal Zoom OAuth token
 * (e.g. for freelancers who want to user their own Zoom account when creating
 * meetings).
 */
export interface UserInterface extends AccountInterface {
  orgs: string[];
  zooms: ZoomUser[];
  availability: Availability;
  mentoring: Subjects;
  tutoring: Subjects;
  langs: string[];
  parents: string[];
  verifications: Verification[];
  visible: boolean;
  featured: Aspect[];
  token?: string;
  hash?: string;
}

/**
 * What results from searching our users Algolia index.
 */
export type UserSearchHit = ObjectWithObjectID &
  Omit<UserInterface, 'availability' | 'verifications' | 'zooms'> & {
    availability: AvailabilitySearchHit;
    verifications: VerificationSearchHit[];
    zooms: ZoomUserSearchHit[];
  };

export type UserJSON = Omit<
  UserInterface,
  | keyof AccountInterface
  | 'availability'
  | 'verifications'
  | 'zooms'
  | 'token'
  | 'hash'
> &
  AccountJSON & {
    availability: AvailabilityJSON;
    verifications: VerificationJSON[];
    zooms: ZoomUserJSON[];
    token: string | null;
    hash: string | null;
  };

export function isUserJSON(json: unknown): json is UserJSON {
  if (!isJSON(json)) return false;
  if (!isStringArray(json.orgs)) return false;
  if (!isArray(json.zooms, isZoomUserJSON)) return false;
  if (!isAvailabilityJSON(json.availability)) return false;
  if (!isSubjects(json.mentoring)) return false;
  if (!isSubjects(json.tutoring)) return false;
  if (!isStringArray(json.langs)) return false;
  if (!isStringArray(json.parents)) return false;
  if (!isArray(json.verifications, isVerificationJSON)) return false;
  if (typeof json.visible !== 'boolean') return false;
  if (!isArray(json.featured, isAspect)) return false;
  if (json.token && typeof json.token !== 'string') return false;
  if (json.hash && typeof json.hash !== 'string') return false;
  if (!isAccountJSON(json)) return false;
  return true;
}

export type UserWithRoles = User & { roles: Role[] };

/**
 * Class that provides default values for our `UserInterface` data model.
 * @see {@link https://stackoverflow.com/a/54857125/10023158}
 */
export class User extends Account implements UserInterface {
  public orgs: string[] = [];

  public zooms: ZoomUser[] = [];

  public availability: Availability = new Availability();

  public mentoring: Subjects = { subjects: [], searches: [] };

  public tutoring: Subjects = { subjects: [], searches: [] };

  public langs: string[] = [];

  public parents: string[] = [];

  public verifications: Verification[] = [];

  public visible = false;

  public featured: Aspect[] = [];

  public token?: string;

  public hash?: string;

  /**
   * Creates a new `User` object by overriding all of our default values w/ the
   * values contained in the given `UserInterface` object.
   *
   * Note that this constructor will also normalize any given `phone` values to
   * the standard [E.164 format]{@link https://en.wikipedia.org/wiki/E.164}.
   *
   * @todo Perhaps add an explicit check to ensure that the given `val`'s type
   * matches the default value at `this[key]`'s type; and then only update the
   * default value if the types match.
   */
  public constructor(user: Partial<UserInterface> = {}) {
    super(user);
    construct<UserInterface, AccountInterface>(this, user, new Account());
  }

  public get firstName(): string {
    return this.name.split(' ')[0];
  }

  public get lastName(): string {
    const parts: string[] = this.name.split(' ');
    return parts[parts.length - 1];
  }

  public toPerson(): Person {
    return {
      id: this.id,
      name: this.name,
      photo: this.photo,
      handle: uuid(),
      roles: [],
    };
  }

  public static fromSearchHit(hit: UserSearchHit): User {
    const { availability, verifications, zooms, objectID, ...rest } = hit;
    const user: Partial<UserInterface> = {
      ...rest,
      availability: Availability.fromSearchHit(availability),
      verifications: verifications.map((v) => Verification.fromSearchHit(v)),
      zooms: zooms.map((z) => ZoomUser.fromSearchHit(z)),
      id: objectID,
    };
    return new User(user);
  }

  public static fromFirestore(snapshot: DocumentSnapshot): User {
    const userData: DocumentData | undefined = snapshot.data();
    if (userData) {
      const { availability, verifications, zooms, ...rest } = userData;
      return new User({
        ...rest,
        availability: Availability.fromFirestore(availability),
        verifications: verificationsFromFirestore(verifications),
        zooms: zoomsFromFirestore(zooms),
        ref: snapshot.ref,
        id: snapshot.id,
      });
    }
    console.warn(
      `[WARNING] Tried to create user (${snapshot.ref.id}) from ` +
        'non-existent Firestore document.'
    );
    return new User();
  }

  public toFirestore(): DocumentData {
    return firestoreVals({
      ...super.toFirestore(),
      availability: this.availability.toFirestore(),
      verifications: this.verifications.map((v) => v.toFirestore()),
      zooms: this.zooms.map((z) => z.toFirestore()),
      token: undefined,
      hash: undefined,
    });
  }

  public static fromJSON(json: UserJSON): User {
    const {
      availability,
      verifications,
      zooms,
      token,
      hash,
      background,
      ...rest
    } = json;
    return new User({
      ...rest,
      availability: Availability.fromJSON(availability),
      verifications: verifications.map((v) => Verification.fromJSON(v)),
      zooms: zooms.map((z) => ZoomUser.fromJSON(z)),
      background: background || undefined,
      token: token || undefined,
      hash: hash || undefined,
    });
  }

  public toJSON(): UserJSON {
    const {
      availability,
      verifications,
      zooms,
      token,
      hash,
      background,
      ref,
      ...rest
    } = this;
    return {
      ...rest,
      availability: availability.toJSON(),
      verifications: verifications.map((v) => v.toJSON()),
      zooms: zooms.map((z) => z.toJSON()),
      background: background || null,
      token: null,
      hash: null,
    };
  }
}
