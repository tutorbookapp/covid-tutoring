/**
 * Assigns the `base` all the valid properties of the `partial` (that are the
 * same type as the default values of `base`) that are not already defined in
 * `inheritor` (e.g. typically the super class or interface).
 *
 * Note that there is a known issue: we *will* override values if they are
 * explicitly set to `undefined` in the given `partial` (this is for the `Query`
 * object where an `undefined` visible property is needed to specify a third
 * boolean state).
 */
export default function construct<T extends S, S = unknown>(
  base: T,
  partial: Partial<T>,
  inheritor?: S
): void {
  Object.entries(partial).forEach(([key, val]: [string, unknown]) => {
    if (key in base && !(key in (inheritor || {}))) {
      const kkey = key as keyof T;
      const vval = val as T[keyof T];
      const valid =
        vval === undefined ||
        base[kkey] === undefined ||
        typeof vval === typeof base[kkey];
      /* eslint-disable-next-line no-param-reassign */
      if (valid) base[kkey] = vval;
    }
  });
}
