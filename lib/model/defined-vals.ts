/**
 * Converts a given data model object into a Firestore-valid datatype by
 * removing any "undefined" values.
 * @param obj - The data model to clean.
 * @return The data model without any "undefined" properties.
 */
export default function definedVals<T>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, val]) => val !== undefined)
  ) as T;
}
