import * as admin from 'firebase-admin';

import {
  Account,
  AccountFirestore,
  AccountInterface,
  AccountJSON,
  AccountSearchHit,
  isAccountJSON,
} from 'lib/model/account';
import { Aspect, isAspect } from 'lib/model/aspect';
import { isArray, isJSON, isStringArray } from 'lib/model/json';
import { UserInterface } from 'lib/model/user';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

type DocumentSnapshot = admin.firestore.DocumentSnapshot;

type Config<T> = { [locale: string]: T };
type AspectConfig<T> = Config<{ [key in Aspect]?: T }>;

type SignupConfig = AspectConfig<{ header: string; body: string; bio: string }>;
type HomeConfig = Config<{ header: string; body: string }>;
type BookingConfig = Config<{ message: string }>;

export function isSignupConfig(config: unknown): config is SignupConfig {
  if (!isJSON(config)) return false;
  return Object.values(config).every((localeConfig) => {
    if (!isJSON(localeConfig)) return false;
    if (!Object.keys(localeConfig).every((k) => isAspect(k))) return false;
    return Object.values(localeConfig).every((aspectConfig) => {
      if (!isJSON(aspectConfig)) return false;
      if (typeof aspectConfig.header !== 'string') return false;
      if (typeof aspectConfig.body !== 'string') return false;
      if (typeof aspectConfig.bio !== 'string') return false;
      return true;
    });
  });
}

export function isHomeConfig(config: unknown): config is SignupConfig {
  if (!isJSON(config)) return false;
  return Object.values(config).every((localeConfig) => {
    if (!isJSON(localeConfig)) return false;
    if (typeof localeConfig.header !== 'string') return false;
    if (typeof localeConfig.body !== 'string') return false;
    return true;
  });
}

export function isBookingConfig(config: unknown): config is BookingConfig {
  if (!isJSON(config)) return false;
  return Object.values(config).every((localeConfig) => {
    if (!isJSON(localeConfig)) return false;
    if (typeof localeConfig.message !== 'string') return false;
    return true;
  });
}

/**
 * The only two Zoom OAuth scopes that we ever will request access to.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/100}
 * @see {@link https://marketplace.zoom.us/docs/guides/auth/oauth/oauth-scopes}
 */
export type ZoomScope = 'meeting:write:admin' | 'user:write:admin';

export function isZoomScope(json: unknown): json is ZoomScope {
  if (typeof json !== 'string') return false;
  return ['meeting:write:admin', 'user:write:admin'].includes(json);
}

/**
 * An authentication config for a certain Zoom account. This enables us to call
 * Zoom APIs on behalf of a user or org (using OAuth patterns).
 * @typedef {Object} ZoomAccount
 * @property id - The Zoom account ID that has given us authorization.
 * @property token - The Zoom `refresh_token` we can use to access Zoom APIs.
 * @property scopes - The scopes that `refresh_token` gives us access to.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/100}
 * @see {@link https://marketplace.zoom.us/docs/guides/auth/oauth}
 */
export interface ZoomAccount {
  id: string;
  token: string;
  scopes: ZoomScope[];
}

export function isZoomAccount(json: unknown): json is ZoomAccount {
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'string') return false;
  if (typeof json.token !== 'string') return false;
  if (!isArray(json.scopes, isZoomScope)) return false;
  return true;
}

/**
 * An `Org` object represents a non-profit organization that is using Tutorbook
 * to manage their virtual tutoring programs.
 * @typedef {Object} Org
 * @property members - An array of user UIDs that are members of this org.
 * @property aspects - The supported aspects of a given org (i.e. are they more
 * focused on `tutoring` or `mentoring`). The first one listed is the default.
 * @property domains - Array of valid email domains that can access this org's
 * data (e.g. `pausd.us` and `pausd.org`).
 * @property profiles - Array of required profile fields (e.g. `phone`).
 * @property [zoom] - This org's Zoom OAuth config. Used to create meetings and
 * (optionally) users.
 * @property signup - Configuration for the org's unique custom sign-up page.
 * @property home - Configuration for the org's unique custom landing homepage.
 * @property booking - Configuration for the org's user booking pages.
 * @property [matchLink] - Temporary fix for QuaranTunes' need to link to a
 * Picktime page for scheduling instead of creating matches within TB.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/138}
 */
export interface OrgInterface extends AccountInterface {
  members: string[];
  aspects: Aspect[];
  domains: string[];
  profiles: (keyof UserInterface | 'subjects')[];
  subjects?: string[];
  zoom?: ZoomAccount;
  signup: SignupConfig;
  home: HomeConfig;
  booking: BookingConfig;
  matchURL?: string;
}

export type OrgJSON = Omit<OrgInterface, keyof Account> & AccountJSON;
export type OrgSearchHit = Omit<OrgInterface, keyof Account> & AccountSearchHit;
export type OrgFirestore = Omit<OrgInterface, keyof Account> & AccountFirestore;

// TODO: Check that the `profiles` key only contains keys of the `User` object.
export function isOrgJSON(json: unknown): json is OrgJSON {
  if (!isAccountJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (!isStringArray(json.members)) return false;
  if (!isArray(json.aspects, isAspect)) return false;
  if (!isStringArray(json.domains)) return false;
  if (!isStringArray(json.profiles)) return false;
  if (json.subjects && !isStringArray(json.subjects)) return false;
  if (json.zoom && !isZoomAccount(json.zoom)) return false;
  if (!isSignupConfig(json.signup)) return false;
  if (!isHomeConfig(json.home)) return false;
  if (!isBookingConfig(json.booking)) return false;
  if (json.matchURL && typeof json.matchURL !== 'string') return false;
  return true;
}

export class Org extends Account implements OrgInterface {
  public members: string[] = [];

  public aspects: Aspect[] = ['tutoring'];

  public domains: string[] = [];

  public profiles: (keyof UserInterface | 'subjects')[] = [
    'name',
    'email',
    'bio',
    'subjects',
    'langs',
    'availability',
  ];

  public subjects?: string[];

  public zoom?: ZoomAccount;

  // TODO: Don't only include org data that the user is an admin of. Instead,
  // keep an app-wide org context that includes the org configurations for all
  // of the orgs a user is a part of. We'll need that data to customize the user
  // specific pages (e.g. their universal profile page, matches schedule, etc).
  // TODO: Include these org specific bio placeholders in the user profile page.
  public signup: SignupConfig = {
    en: {
      mentoring: {
        header: 'Guide the next generation',
        body:
          "Help us redefine mentorship. We're connecting high performing and " +
          'underserved 9-12 students with experts (like you) to collaborate ' +
          "on meaningful projects that you're both passionate about. " +
          'Complete the form below to create your profile and sign-up as a ' +
          'mentor.',
        bio:
          'Ex: Founder of "The Church Co", Drummer, IndieHacker.  I\'m ' +
          'currently working on "The Church Co" ($30k MRR) where we create ' +
          "high quality, low cost websites for churches and nonprofits. I'd " +
          'love to have a student shadow my work and help build some church ' +
          'websites.',
      },
      tutoring: {
        header: 'Support students throughout COVID',
        body:
          'Help us support the millions of K-12 students who no longer have ' +
          "individualized instruction due to COVID-19. We're making sure " +
          'that no one loses out on education in these difficult times by ' +
          'connecting students with free, volunteer tutors like you.',
        bio:
          "Ex: I'm currently an electrical engineering Ph.D. student at " +
          'Stanford University who has been volunteering with AmeriCorps ' +
          "(tutoring local high schoolers) for over five years now. I'm " +
          'passionate about teaching and would love to help you in any way ' +
          'that I can!',
      },
    },
  };

  public home: HomeConfig = {
    en: {
      header: 'How it works',
      body:
        'First, new volunteers register using the sign-up form linked to the ' +
        'right. Organization admins then vet those volunteers (to ensure ' +
        'they are who they say they are) before adding them to the search ' +
        'view for students to find. Finally, students and parents use the ' +
        'search view (linked to the right) to find and request those ' +
        'volunteers. Recurring meetings (e.g. on Zoom or Google Meet) are ' +
        'then set up via email.',
    },
  };

  public booking: BookingConfig = {
    en: {
      message:
        'Ex: {{person}} could really use your help with a {{subject}} project.',
    },
  };

  public matchURL?: string;

  public constructor(org: Partial<OrgInterface> = {}) {
    super(org);
    construct<OrgInterface, AccountInterface>(this, org, new Account());
  }

  public get clone(): Org {
    return new Org(clone(this));
  }

  public toJSON(): OrgJSON {
    return definedVals({ ...this, ...super.toJSON() });
  }

  public static fromJSON(json: OrgJSON): Org {
    return new Org({ ...json, ...Account.fromJSON(json) });
  }

  public toFirestore(): OrgFirestore {
    return definedVals({ ...this, ...super.toFirestore() });
  }

  public static fromFirestore(data: OrgFirestore): Org {
    return new Org({ ...data, ...Account.fromFirestore(data) });
  }

  public static fromFirestoreDoc(snapshot: DocumentSnapshot): Org {
    if (!snapshot.exists) return new Org();
    const overrides = definedVals({
      created: snapshot.createTime?.toDate(),
      updated: snapshot.updateTime?.toDate(),
      id: snapshot.id,
    });
    const org = Org.fromFirestore(snapshot.data() as OrgFirestore);
    return new Org({ ...org, ...overrides });
  }

  public toSearchHit(): OrgSearchHit {
    return definedVals({
      ...this,
      ...super.toSearchHit(),
      id: undefined,
    });
  }

  public static fromSearchHit(hit: OrgSearchHit): Org {
    return new Org({ ...hit, ...Account.fromSearchHit(hit) });
  }
}
