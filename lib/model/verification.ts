import {
  Resource,
  ResourceFirestore,
  ResourceInterface,
  ResourceJSON,
  ResourceSearchHit,
  isResourceJSON,
} from 'lib/model/resource';
import { isArray, isJSON } from 'lib/model/json';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';

/**
 * A check is a single aspect of a verification.
 * @example
 * - A verified university email address (e.g. `@stanford.edu`).
 * - A verified normal email address.
 * - A verified social (@see {@link SocialTypeAlias}) account (e.g. LinkedIn).
 * - A DBS check on file.
 */
export type Check =
  | 'email'
  | 'background-check'
  | 'academic-email'
  | 'training'
  | 'interview';

export function isCheck(json: unknown): json is Check {
  const checks = [
    'email',
    'background-check',
    'academic-email',
    'training',
    'interview',
  ];

  if (typeof json !== 'string') return false;
  if (!checks.includes(json)) return false;
  return true;
}

/**
 * A verification is run by a non-profit organization (the `org`) by a member of
 * that organization (the `creator`). The non-profit takes full responsibility 
 * for their verification and liability for the user's actions.
 * @typedef {Object} Verification
 * @extends Resource
 * @property creator - The uID of the user who ran the verification.
 * @property org - The id of the non-profit org that the `creator` belongs to.
 * @property notes - Any notes about the verification (e.g. what happened).
 * @property checks - An array of checks (@see {@link Check}) passed.
 */
export interface VerificationInterface extends ResourceInterface {
  creator: string;
  org: string;
  notes: string;
  checks: Check[];
}

export type VerificationJSON = Omit<
  VerificationInterface,
  keyof ResourceInterface
> &
  ResourceJSON;
export type VerificationFirestore = Omit<
  VerificationInterface,
  keyof ResourceInterface
> &
  ResourceFirestore;
export type VerificationSearchHit = Omit<
  VerificationInterface,
  keyof Resource
> &
  ResourceSearchHit;

export function isVerificationJSON(json: unknown): json is VerificationJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.creator !== 'string') return false;
  if (typeof json.org !== 'string') return false;
  if (typeof json.notes !== 'string') return false;
  if (!isArray(json.checks, isCheck)) return false;
  return true;
}

export class Verification extends Resource implements VerificationInterface {
  public creator = '';

  public org = 'default';

  public notes = '';

  public checks: Check[] = [];

  public constructor(verification: Partial<VerificationInterface> = {}) {
    super(verification);
    construct<VerificationInterface, ResourceInterface>(
      this,
      verification,
      new Resource()
    );
  }

  public get clone(): Verification {
    return new Verification(clone(this));
  }

  public toJSON(): VerificationJSON {
    return { ...this, ...super.toJSON() };
  }

  public static fromJSON(json: VerificationJSON): Verification {
    return new Verification({ ...json, ...Resource.fromJSON(json) });
  }

  public toFirestore(): VerificationFirestore {
    return { ...this, ...super.toFirestore() };
  }

  public static fromFirestore(data: VerificationFirestore): Verification {
    return new Verification({ ...data, ...Resource.fromFirestore(data) });
  }

  public toSearchHit(): VerificationSearchHit {
    return { ...this, ...super.toSearchHit() };
  }

  public static fromSearchHit(hit: VerificationSearchHit): Verification {
    return new Verification({ ...hit, ...Resource.fromSearchHit(hit) });
  }
}
