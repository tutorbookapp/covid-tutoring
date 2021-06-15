import { Option, Query, QueryInterface } from 'lib/model/query/base';
import construct from 'lib/model/construct';

// TODO: Should the `people` query be instead `UserOption` objects?
export interface MatchesQueryInterface extends QueryInterface {
  org?: string;
  people: Option<string>[];
  subjects: Option<string>[];
}

export type MatchesQueryJSON = MatchesQueryInterface;

export type MatchesQueryURL = { [key in keyof MatchesQueryInterface]?: string };

// TODO: Implement this to verify that the given query params are valid.
export function isMatchesQueryURL(query: unknown): query is MatchesQueryURL {
  return true;
}

export class MatchesQuery extends Query implements MatchesQueryInterface {
  public org?: string;

  public people: Option<string>[] = [];

  public subjects: Option<string>[] = [];

  public hitsPerPage = 10;

  public constructor(query: Partial<MatchesQueryInterface> = {}) {
    super(query);
    construct<MatchesQueryInterface>(this, query);
  }

  public getURLParams(): Record<string, string | number | boolean> {
    function encode(p?: Option<any>[]): string {
      return encodeURIComponent(JSON.stringify(p));
    }

    const query = super.getURLParams();
    if (this.hitsPerPage !== 10) {
      query.hitsPerPage = this.hitsPerPage;
    } else {
      delete query.hitsPerPage;
    }
    if (this.org) query.org = encodeURIComponent(this.org);
    if (this.people.length) query.people = encode(this.people);
    if (this.subjects.length) query.subjects = encode(this.subjects);
    return query;
  }

  public static fromURLParams(params: MatchesQueryURL): MatchesQuery {
    function decode<T = string>(p?: string): Option<T>[] {
      return p ? (JSON.parse(decodeURIComponent(p)) as Option<T>[]) : [];
    }

    return new MatchesQuery({
      ...Query.fromURLParams(params),
      people: decode(params.people),
      subjects: decode(params.subjects),
      org: params.org ? decodeURIComponent(params.org) : undefined,
      hitsPerPage: Number(decodeURIComponent(params.hitsPerPage || '10')),
    });
  }

  public get endpoint(): string {
    return this.getURL('/api/matches');
  }

  public static fromJSON(json: MatchesQueryJSON): MatchesQuery {
    return new MatchesQuery(Query.fromJSON(json));
  }
}
