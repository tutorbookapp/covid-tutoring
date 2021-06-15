import {
  Resource,
  ResourceFirestore,
  ResourceInterface,
  ResourceJSON,
  ResourceSearchHit,
  isResourceJSON,
} from 'lib/model/resource';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import { isJSON } from 'lib/model/json';

/**
 * A user's Zoom account that belongs to a certain org.
 * @typedef {Object} ZoomUser
 * @extends Resource
 * @property id - The Zoom-assigned user ID.
 * @property email - The email address used with the Zoom user account.
 * @property org - The ID of the TB org under which this Zoom user belongs.
 */
export interface ZoomUserInterface extends ResourceInterface {
  id: string;
  email: string;
  org: string;
}

export type ZoomUserJSON = Omit<ZoomUserInterface, keyof Resource> &
  ResourceJSON;
export type ZoomUserFirestore = Omit<ZoomUserInterface, keyof Resource> &
  ResourceFirestore;
export type ZoomUserSearchHit = Omit<ZoomUserInterface, keyof Resource> &
  ResourceSearchHit;

export function isZoomUserJSON(json: unknown): json is ZoomUserJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'string') return false;
  if (typeof json.email !== 'string') return false;
  if (typeof json.org !== 'string') return false;
  return true;
}

export class ZoomUser extends Resource implements ZoomUserInterface {
  public id = '';

  public email = '';

  public org = 'default';

  public constructor(user: Partial<ZoomUserInterface>) {
    super(user);
    construct<ZoomUserInterface, ResourceInterface>(this, user, new Resource());
  }

  public get clone(): ZoomUser {
    return new ZoomUser(clone(this));
  }

  public toJSON(): ZoomUserJSON {
    return { ...this, ...super.toJSON() };
  }

  public static fromJSON(json: ZoomUserJSON): ZoomUser {
    return new ZoomUser({ ...json, ...Resource.fromJSON(json) });
  }

  public toFirestore(): ZoomUserFirestore {
    return { ...this, ...super.toFirestore() };
  }

  public static fromFirestore(data: ZoomUserFirestore): ZoomUser {
    return new ZoomUser({ ...data, ...Resource.fromFirestore(data) });
  }

  public toSearchHit(): ZoomUserSearchHit {
    return { ...this, ...super.toSearchHit() };
  }

  public static fromSearchHit(data: ZoomUserSearchHit): ZoomUser {
    return new ZoomUser({ ...data, ...Resource.fromSearchHit(data) });
  }
}
