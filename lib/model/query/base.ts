import url from 'url';

import construct from 'lib/model/construct';

export interface Option<T> {
  label: string;
  value: T;
}

/**
 * The base object just supports pagination, text-based search, and tag filters.
 * @abstract
 * @property search - The current string search query.
 * @property orgs - The organizations that the resource belongs to.
 * @property tags - Algolia search `__tags` (e.g. `NOT_YET_VETTED`).
 * @property hitsPerPage - The number of hits to display per page (pagination).
 * @property page - The current page number (for pagination purposes).
 */
export interface QueryInterface {
  search: string;
  hitsPerPage: number;
  page: number;
}

export type QueryJSON = QueryInterface;

export type QueryURL = { [key in keyof QueryInterface]?: string };

export abstract class Query implements QueryInterface {
  public search = '';

  // The number of hits per page (for pagination purposes).
  // @see {@link https://www.algolia.com/doc/guides/building-search-ui/going-further/backend-search/how-to/pagination/}
  // @see {@link https://www.algolia.com/doc/api-reference/api-parameters/hitsPerPage/}
  public hitsPerPage = 20;

  // The current page number. For some CS-related reason, Algolia starts
  // counting page numbers from 0 instead of 1.
  // @see {@link https://www.algolia.com/doc/api-reference/api-parameters/page/}
  public page = 0;

  public constructor(query: Partial<QueryInterface> = {}) {
    construct<QueryInterface>(this, query);
  }

  public abstract get endpoint(): string;

  public getURLParams(): Record<string, string | number | boolean> {
    const query: Record<string, string | number | boolean> = {};
    if (this.search) query.search = encodeURIComponent(this.search);
    if (this.hitsPerPage !== 20) query.hitsPerPage = this.hitsPerPage;
    if (this.page !== 0) query.page = this.page;
    return query;
  }

  public getURL(pathname: string): string {
    return url.format({ pathname, query: this.getURLParams() });
  }

  public static fromURLParams(params: QueryURL): QueryInterface {
    return {
      search: decodeURIComponent(params.search || ''),
      hitsPerPage: Number(decodeURIComponent(params.hitsPerPage || '20')),
      page: Number(decodeURIComponent(params.page || '0')),
    };
  }

  public static fromJSON(json: QueryJSON): QueryInterface {
    return json;
  }

  public getPaginationString(hits: number): string {
    const begin: number = this.hitsPerPage * this.page + 1;
    const end: number = this.hitsPerPage * (this.page + 1);
    return `${begin}-${end > hits ? hits : end} of ${hits}`;
  }
}
