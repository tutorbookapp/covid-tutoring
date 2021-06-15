import {
  MatchesQuery,
  MatchesQueryInterface,
  MatchesQueryJSON,
  isMatchesQueryURL,
} from 'lib/model/query/matches';
import { MeetingHitTag } from 'lib/model/meeting';
import construct from 'lib/model/construct';

export interface MeetingsQueryInterface extends MatchesQueryInterface {
  tags: MeetingHitTag[];
  from: Date;
  to: Date;
}

export type MeetingsQueryJSON = Omit<
  MeetingsQueryInterface,
  keyof MatchesQueryInterface | 'from' | 'to'
> &
  MatchesQueryJSON & { from: string; to: string };

export type MeetingsQueryURL = {
  [key in keyof MeetingsQueryInterface]?: string;
};

// TODO: Implement this to verify that the given query params are valid.
export function isMeetingsQueryURL(query: unknown): query is MeetingsQueryURL {
  return isMatchesQueryURL(query);
}

export class MeetingsQuery
  extends MatchesQuery
  implements MeetingsQueryInterface {
  public tags: MeetingHitTag[] = [];

  // Start query on the most recent Sunday at 12am.
  public from = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() - new Date().getDay()
  );

  // End query on the next Sunday at 12am (instead of Saturday 11:59:59.99).
  public to = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() - new Date().getDay() + 7
  );

  // TODO: Will there ever be more than 1000 meetings to display at once?
  public hitsPerPage = 1000;

  public constructor(query: Partial<MeetingsQueryInterface> = {}) {
    super(query);
    construct<MeetingsQueryInterface, MatchesQueryInterface>(
      this,
      query,
      new MatchesQuery()
    );
  }

  public getURLParams(): Record<string, string | number | boolean> {
    function encode(p?: any[]): string {
      return encodeURIComponent(JSON.stringify(p));
    }

    const query = super.getURLParams();
    if (this.hitsPerPage !== 1000) {
      query.hitsPerPage = this.hitsPerPage;
    } else {
      delete query.hitsPerPage;
    }
    if (this.tags.length) query.tags = encode(this.tags);
    query.from = this.from.toJSON();
    query.to = this.to.toJSON();
    return query;
  }

  public static fromURLParams(params: MeetingsQueryURL): MeetingsQuery {
    function decode<T>(p?: string): T[] {
      return p ? (JSON.parse(decodeURIComponent(p)) as T[]) : [];
    }

    return new MeetingsQuery({
      ...MatchesQuery.fromURLParams(params),
      tags: decode<MeetingHitTag>(params.tags),
      from: new Date(params.from || new Date().toJSON()),
      to: new Date(params.to || new Date().toJSON()),
      hitsPerPage: Number(decodeURIComponent(params.hitsPerPage || '1000')),
    });
  }

  public get endpoint(): string {
    return this.getURL('/api/meetings');
  }

  public static fromJSON(json: MeetingsQueryJSON): MeetingsQuery {
    return new MeetingsQuery({
      ...MatchesQuery.fromJSON(json),
      from: new Date(json.from),
      to: new Date(json.to),
    });
  }
}
