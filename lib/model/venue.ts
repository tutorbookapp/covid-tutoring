import { nanoid } from 'nanoid';

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
 * A venue for a tutoring or mentoring match to occur (e.g. Zoom or Jitsi).
 * @typedef {Object} Venue
 * @extends Resource
 * @property url - The URL of the venue (right now, all venues are online and
 * thus have a definitive URL).
 */
export interface VenueInterface extends ResourceInterface {
  id: string;
  url: string;
}

export type VenueJSON = Omit<VenueInterface, keyof Resource> & ResourceJSON;
export type VenueFirestore = Omit<VenueInterface, keyof Resource> &
  ResourceFirestore;
export type VenueSearchHit = Omit<VenueInterface, keyof Resource> &
  ResourceSearchHit;

export function isVenueJSON(json: unknown): json is VenueJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'string') return false;
  if (typeof json.url !== 'string') return false;
  return true;
}

export class Venue extends Resource implements VenueInterface {
  public id = nanoid(10);

  public url = `https://meet.jit.si/TB-${this.id}`;

  public constructor(venue: Partial<VenueInterface> = {}) {
    super(venue);
    construct<VenueInterface, ResourceInterface>(this, venue, new Resource());
  }

  public get clone(): Venue {
    return new Venue(clone(this));
  }

  public toJSON(): VenueJSON {
    return { ...this, ...super.toJSON() };
  }

  public static fromJSON(json: VenueJSON): Venue {
    return new Venue({ ...json, ...Resource.fromJSON(json) });
  }

  public toFirestore(): VenueFirestore {
    return { ...this, ...super.toFirestore() };
  }

  public static fromFirestore(data: VenueFirestore): Venue {
    return new Venue({ ...data, ...Resource.fromFirestore(data) });
  }

  public toSearchHit(): VenueSearchHit {
    return { ...this, ...super.toSearchHit() };
  }

  public static fromSearchHit(hit: VenueSearchHit): Venue {
    return new Venue({ ...hit, ...Resource.fromSearchHit(hit) });
  }
}
