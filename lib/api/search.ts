import algoliasearch from 'algoliasearch';

import { Option, Query } from 'lib/model/query/base';
import { APIError } from 'lib/api/error';

const prefix = process.env.ALGOLIA_PREFIX || (process.env.APP_ENV as string);
const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
const algoliaKey = process.env.ALGOLIA_ADMIN_KEY as string;

const client = algoliasearch(algoliaId, algoliaKey);

/**
 * Adds a filter to an existing filter string (concatenating them with ' AND ').
 * @param base - The existing filter string (e.g. `visible:true AND `).
 * @param filter - The filter to add (e.g. `langs:en`).
 * @return The combined filter string (e.g. `visible:true AND langs:en`).
 */
export function addStringFilter(base: string, filter: string): string {
  const addAND = base.length && !base.endsWith(' AND ') && filter.length;
  return addAND ? `${base} AND ${filter}` : `${base}${filter}`;
}

/**
 * Adds an array of filters to an existing filter string.
 * @param base - The existing filter string (e.g. `visible:true`).
 * @param filters - The array of filters to add.
 * @param attr - The attribute the `filters` are for (e.g. `lang`).
 * @param concat - Whether each option must be `AND` or `OR`.
 * @return The filter string with all the `Option` filters added.
 */
export function addArrayFilter(
  base: string,
  filters: string[] | number[],
  attr: string,
  concat: 'OR' | 'AND' = 'AND'
): string {
  const addAND = base.length && !base.endsWith(' AND ') && filters.length;
  let filterString = addAND ? `${base} AND ` : base;
  filters.forEach((filter: string | number, idx: number) => {
    filterString += idx === 0 ? '(' : ` ${concat} `;
    filterString += `${attr}:"${filter}"`;
    if (idx === filters.length - 1) filterString += ')';
  });
  return filterString;
}

/**
 * Adds `Option` filters to an existing filter string.
 * @param base - The existing filter string (e.g. `visible:true`).
 * @param filters - The `Option` filters (we filter by their `value` prop).
 * @param attr - The attribute the `filters` are for (e.g. `lang`).
 * @param concat - Whether each option must be `AND` or `OR`.
 * @return The filter string with all the `Option` filters added.
 */
export function addOptionsFilter(
  base: string,
  filters: Option[],
  attr: string,
  concat: 'OR' | 'AND' = 'AND'
): string {
  return addArrayFilter(
    base,
    filters.map((f) => f.value),
    attr,
    concat
  );
}

/**
 * Lists all results (on `page` within `hitsPerPage`) that fit certain filters.
 * @param indexId - The index to search without the env included (e.g. `users`).
 * @param query - Base query object to extract `page`, `hitsPerPage`, and a
 * text-based `search` (if any).
 * @param fromSearchHit - Method that converts search hit object to data model.
 * @param filterStrings - An array of Algolia-supported filter strings.
 * @param [optionalFilterStrings] - An array of optional filter strings.
 * @return Object with `hits` (the total number of results that fit the filters)
 * and `results` (the current results based on `page` and `hitsPerPage`).
 */
export async function list<T, H = T>(
  indexId: string,
  { page, hitsPerPage, search }: Query,
  fromSearchHit: (hit: H) => T,
  filterStrings: string[],
  optionalFilters?: string
): Promise<{ results: T[]; hits: number }> {
  try {
    let hits = 0;
    const results: T[] = [];
    const idx = client.initIndex(`${prefix}-${indexId}`);

    await Promise.all(
      filterStrings.map(async (filters) => {
        const options = { page, hitsPerPage, optionalFilters, filters };
        const res = await idx.search<H>(search, options);
        res.hits.forEach((hit) => results.push(fromSearchHit(hit)));
        hits += res.nbHits;
      })
    );

    return { results, hits };
  } catch (e) {
    let m = `Error filtering ${indexId}`;
    if (e instanceof Error) m = `${e.name} filtering ${indexId}: ${e.message}`;
    if (typeof e?.message === 'string') m += `: ${e.message}`;
    if (typeof e === 'string') m += `: ${e}`;
    throw new APIError(m, 500);
  }
}
