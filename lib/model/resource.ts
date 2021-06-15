import * as admin from 'firebase-admin';

import { isDateJSON, isJSON } from 'lib/model/json';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';

export interface Constructor<T> {
  new (partial: Partial<T>): T;
}

type Timestamp = admin.firestore.Timestamp;

/**
 * The base interface for all of our data models.
 * @typedef {Object} Resource
 * @property created - When the resource was first created.
 * @property updated - The last time the resource was updated.
 */
export interface ResourceInterface {
  created: Date;
  updated: Date;
}

export interface ResourceJSON {
  created: string;
  updated: string;
}

export interface ResourceFirestore {
  created: Timestamp;
  updated: Timestamp;
}

export interface ResourceSearchHit {
  created: number;
  updated: number;
}

export function isResourceJSON(json: unknown): json is ResourceJSON {
  if (!isJSON(json)) return false;
  if (!isDateJSON(json.created)) return false;
  if (!isDateJSON(json.updated)) return false;
  return true;
}

export class Resource implements ResourceInterface {
  public created: Date = new Date();

  public updated: Date = new Date();

  public constructor(resource: Partial<ResourceInterface> = {}) {
    construct<ResourceInterface>(this, resource);
  }

  public get clone(): Resource {
    return new Resource(clone(this));
  }

  public toJSON(): ResourceJSON {
    return {
      created: this.created.toJSON(),
      updated: this.updated.toJSON(),
    };
  }

  public static fromJSON(json: ResourceJSON): Resource {
    return new Resource({
      created: new Date(json.created),
      updated: new Date(json.updated),
    });
  }

  public toFirestore(): ResourceFirestore {
    return {
      created: (this.created as unknown) as Timestamp,
      updated: (this.updated as unknown) as Timestamp,
    };
  }

  public static fromFirestore(data: ResourceFirestore): Resource {
    return new Resource({
      created: data.created.toDate(),
      updated: data.updated.toDate(),
    });
  }

  public toSearchHit(): ResourceSearchHit {
    return {
      created: this.created.valueOf(),
      updated: this.updated.valueOf(),
    };
  }

  public static fromSearchHit(hit: ResourceSearchHit): Resource {
    return new Resource({
      created: new Date(hit.created),
      updated: new Date(hit.updated),
    });
  }
}
