import { Role } from 'lib/model';
import { User } from 'lib/model';
import clone from 'lib/utils/clone';

/**
 * Converts an RRule until string (e.g. `UNTIL=20210515T070000Z`) to a Date.
 * @see {@link https://git.io/JsCuq}
 */
export function untilStringToDate(until: string): Date | undefined {
  const re = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/;
  const bits = re.exec(until);
  return !bits
    ? undefined
    : new Date(
        Date.UTC(
          parseInt(bits[1], 10),
          parseInt(bits[2], 10) - 1,
          parseInt(bits[3], 10),
          parseInt(bits[5], 10) || 0,
          parseInt(bits[6], 10) || 0,
          parseInt(bits[7], 10) || 0
        )
      );
}

/**
 * Converts an RRule into one of Tutorbook's officially supported recur options.
 * We don't use the `rrule` package client-side because of it's bundle size.
 * @see {@link https://bundlephobia.com/result?p=rrule@2.6.8}
 * @see {@link https://git.io/JsCuc}
 */
export function getRecurString(rrule?: string, locale = 'en'): string {
  let recur = '';
  if (!rrule) return recur;
  if (rrule.includes('FREQ=DAILY')) {
    recur = 'Daily';
  } else if (rrule.includes('FREQ=WEEKLY') && rrule.includes('INTERVAL=2')) {
    recur = 'Biweekly';
  } else if (rrule.includes('FREQ=WEEKLY')) {
    recur = 'Weekly';
  } else if (rrule.includes('FREQ=MONTHLY')) {
    recur = 'Monthly';
  }
  rrule
    .replace(/^(?:RRULE|EXRULE):/i, '')
    .split(';')
    .forEach((attr) => {
      const [key, value] = attr.split('=');
      if (key.toUpperCase() === 'UNTIL') {
        const until = untilStringToDate(value);
        if (!until) return;
        const showYear = until.getFullYear() !== new Date().getFullYear();
        const untilString = until.toLocaleString(locale, {
          year: showYear ? 'numeric' : undefined,
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        recur += ` until ${untilString}`;
      }
    });
  return recur;
}

interface PhoneProps {
  name?: string;
  phone: string;
}

/**
 * Returns a link that, when clicked, opens a new SMS message (to the given
 * phone number) that includes the recipient's name.
 * @see {@link https://stackoverflow.com/a/38708066/10023158}
 */
export function getPhoneLink({ name, phone }: PhoneProps): string {
  if (!name) return `sms:${phone}`;
  return `sms:${phone};?&body=${encodeURIComponent(`Hi ${name}!`)}`;
}

interface EmailProps {
  name?: string;
  email: string;
}

export function getEmailLink({ name, email }: EmailProps): string {
  if (!name) return `mailto:${email}`;
  return `mailto:${encodeURIComponent(`"${name}"<${email}>`)}`;
}

/**
 * Replaces the {{var}} dynamic string variables with their values (if
 * available). This allows orgs to customize e.g. booking message placeholders
 * and still take advantage of dynamic variables like {{person}} or {{subject}}.
 */
export function translate(tmpl: string, vals: Record<string, string>): string {
  let str = tmpl;
  Object.entries(vals).forEach(([key, val]) => {
    str = str.replace(`{{${key}}}`, val);
  });
  return str;
}

/**
 * Checks if a given URL is a valid GCP Storage item and, if so, returns the
 * filename within the default GCP Storage bucket.
 * @param url - The URL to check (typically a profile photo URL).
 * @return An empty string (when given an invalid URL) or the filename.
 */
export function getPhotoFilename(url: string): string {
  const env =
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    '(?:production|test|development)';
  const rgx = new RegExp(
    `https:\\/\\/firebasestorage\\.googleapis\\.com\\/v0\\/b\\/${env}-` +
      `tutorbook\\.appspot\\.com\\/o\\/(.*)\\?alt=media&token=(.*)`
  );
  return decodeURIComponent((rgx.exec(url) || [])[1] || '');
}

/**
 * Essentially the same as the above function except much more lenient (i.e.
 * allows `assets.tutorbook.org` images when testing and developing).
 * @param url - The URL to check (typically a profile photo URL).
 * @return Whether or not that image is stored with us in a managed location.
 */
export function validPhoto(url: string): boolean {
  const asset = /https:\/\/assets\.tutorbook\.org\/(.*)/;
  return !!asset.exec(url) || !!getPhotoFilename(url);
}

/**
 * Returns the `not-` tags that correspond to the given tags.
 * e.g. given tags ['meeting', 'vetted'] we would return ['not-matched']
 *      ['meeting', 'not-matched', 'vetted']
 */
export function notTags<T extends string>(tags: T[], TAGS: T[]): T[] {
  return TAGS.filter((t) => !tags.includes(t)).map((t) => `not-${t}` as T);
}

/**
 * Adds roles to a given user object.
 * @param user - The user to add roles to.
 * @param roles - The roles to add.
 * @return A `User` object that contains all data combined.
 */
export function addRoles(user: User, roles: Role[]): User {
  return User.parse(clone({ ...user, roles }));
}

/**
 * Ensures that the given string ends in a period.
 */
export function period(msg: string): string {
  if (!msg || msg.endsWith('.')) return msg;
  return `${msg}.`;
}

/**
 * Capitalizes the first letter of the given string.
 */
export function caps(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

/**
 * Helper function that returns the intersection of two given arrays (using
 * the given `compare` function to check if elements overlap).
 * @see {@link https://stackoverflow.com/a/16227294/10023158}
 */
export function intersection<A extends unknown, B extends unknown>(
  arrA: Array<A>,
  arrB?: Array<B>,
  compare: (a: A, b: B) => boolean = (a, b) => a === b
): Array<A> {
  if (!arrB) return arrA.filter(Boolean);
  return arrA.filter(
    (itemA: A) => arrB.findIndex((itemB: B) => compare(itemA, itemB)) > -1
  );
}

/**
 * Joins the array like the typicall `Array.join` function but adds the
 * `ending` concatenator between the last two items.
 * @example
 * const { join } = require('lib/utils');
 * const subjects = ['Chemistry', 'Chemistry H', 'Algebra 1'];
 * const str = join(subjects, 'or');
 * assert(str === 'Chemistry, Chemistry H, or Algebra 1');
 * @param {any[]} array - The array of (typically) strings to concatenate.
 * @param {string} [ending='and'] - The concatenator to insert between the last
 * two items in the given `arr`.
 * @param {bool} [oxfordComma=false] - Whether or not to have the Oxford
 * comma before the last item.
 * @return {string} The concatenated array in string form (with the given
 * `ending` between the last two items in the given `arr`).
 */
export function join<T = any>(
  array: Array<T>,
  ending = 'and',
  oxfordComma = true
): string {
  /* eslint-disable @typescript-eslint/restrict-template-expressions */
  const arr: Array<T> = Array.from(array);
  if (arr.length === 0) return '';
  if (arr.length === 1) return `${arr[0]}`;
  if (arr.length === 2) return arr.join(` ${ending} `);
  const lastItem: T | undefined = arr.pop();
  const str: string = arr.join(', ');
  return `${str + (oxfordComma ? ', ' : ' ') + ending} ${lastItem}`;
  /* eslint-enable @typescript-eslint/restrict-template-expressions */
}
