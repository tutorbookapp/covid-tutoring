import url from 'url';

import Router from 'next/router';
import { dequal } from 'dequal';
import { useEffect } from 'react';

import { Callback } from 'lib/model/callback';
import { Query } from 'lib/model/query/base';

interface Constructor<T extends Query> {
  parse: (params: unknown) => T;
}

// Syncs the initial query state in URL parameters. This gives users a sharable
// link that contains their query state (e.g. I can share a link showing all the
// Songwriting teachers with another org admin).
// TODO: Perhaps look into directly managing state using the Next.js router.
// TODO: Rethink how this will all work with the new `zod` data models.
export default function useURLParamSync<T extends Query>(
  query: T,
  setQuery: Callback<T>,
  Model: Constructor<T>,
  endpoint: (query: T) => string,
  overrides: string[] = []
): void {
  useEffect(() => {
    setQuery((prev) => {
      if (typeof window === 'undefined') return prev;
      const params = new URLSearchParams(window.location.search);
      const updated = Model.parse({
        ...Object.fromEntries(new URLSearchParams(endpoint(prev)).entries()),
        ...Object.fromEntries(params.entries()),
      });
      if (dequal(prev, updated)) return prev;
      return updated;
    });
  }, [endpoint, setQuery, Model]);

  // TODO: Don't include query params that are specified in other ways (e.g. the
  // users dashboard specifies org in the `[org]` dynamic page param).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = Object.fromEntries(
      new URLSearchParams(endpoint(query)).entries()
    );
    overrides.forEach((field) => {
      delete params[field];
    });
    const updatedURL = url.format({
      pathname: window.location.pathname,
      query: params,
    });
    const prevURL = `${window.location.pathname}${window.location.search}`;
    if (updatedURL === prevURL) return;
    void Router.replace(updatedURL, undefined, { shallow: true });
  }, [endpoint, query, overrides]);
}
