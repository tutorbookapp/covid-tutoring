import { useCallback, useEffect, useMemo, useRef } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import useSWR, { SWRConfig, mutate } from 'swr';
import { AppProps } from 'next/app';
import to from 'await-to-js';

import NProgress from 'components/nprogress';

import { UpdateOrgParam, UpdateUserParam, UserContext } from 'lib/account';
import { ApiError, Org, OrgJSON, User, UserJSON } from 'lib/model';

import 'styles/global.scss';

async function fetcher<T>(url: string): Promise<T> {
  const [err, res] = await to<AxiosResponse<T>, AxiosError<ApiError>>(
    axios.get<T>(url)
  );
  const error: (description: string) => never = (description: string) => {
    throw new Error(description);
  };
  if (err && err.response) {
    error(`API (${url}) responded with error: ${err.response.data.msg}`);
  } else if (err && err.request) {
    error(`API (${url}) did not respond.`);
  } else if (err) {
    error(`${err.name} calling API (${url}): ${err.message}`);
  }
  return (res as AxiosResponse<T>).data;
}

// Installs a service worker and triggers an `/api/account` re-validation once
// the service worker has been activated and is control of this page (i.e. once
// the service worker can intercept our fetch requests and append the auth JWT).
// @see {@link https://bit.ly/3gnChWt}
async function installServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg: ServiceWorkerRegistration) => {
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing as ServiceWorker;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              void mutate('/api/account');
            }
          });
        });
      });
  } else {
    console.error('[ERROR] Service workers are disabled.');
  }
}

export default function App({ Component, pageProps }: AppProps): JSX.Element {
  // The user account state must be defined as a hook here. Otherwise, it gets
  // reset during client-side page navigation.
  const initialPageLoad = useRef<boolean>(true);
  const { data, error } = useSWR<UserJSON, Error>('/api/account', fetcher);
  const user = useMemo(() => (data ? User.fromJSON(data) : new User()), [data]);
  const loggedIn = useMemo(() => {
    if (user.id) {
      initialPageLoad.current = false;
      return true;
    }
    if (error) {
      initialPageLoad.current = false;
      return false;
    }
    if (initialPageLoad.current) return undefined;
    return false;
  }, [user, error]);
  const updateUser = useCallback(
    async (param: UpdateUserParam) => {
      let updatedUser: User = user;
      if (typeof param === 'object') updatedUser = new User(param);
      if (typeof param === 'function') updatedUser = new User(param(user));
      // Re-validate if we haven't gotten any account data yet. This fixes
      // an issue where the profile view would locally update to an empty
      // `User()` *before* our `/api/account` endpoint could respond. SWR
      // cancelled the `/api/account` mutation in favor of the empty one.
      await mutate('/api/account', updatedUser, !loggedIn);
    },
    [user, loggedIn]
  );

  // Consumers can update local app-wide org data (proxy to SWR's mutate FN).
  const { data: orgsData } = useSWR<OrgJSON[]>('/api/orgs', fetcher);
  const orgs = useMemo(() => {
    return orgsData ? orgsData.map((o: OrgJSON) => Org.fromJSON(o)) : [];
  }, [orgsData]);
  const updateOrg = useCallback(
    async (id: string, param: UpdateOrgParam) => {
      const idx = orgs.findIndex((org: Org) => org.id === id);
      if (idx < 0) throw new Error(`Org (${id}) not found in local data.`);
      let updatedOrg: Org = orgs[idx];
      if (typeof param === 'object') updatedOrg = new Org(param);
      if (typeof param === 'function') updatedOrg = new Org(param(updatedOrg));
      const updated = [
        ...orgs.map((org: Org) => org.toJSON()).slice(0, idx),
        updatedOrg.toJSON(),
        ...orgs.map((org: Org) => org.toJSON()).slice(idx + 1),
      ];
      await mutate('/api/orgs', updated, !loggedIn);
    },
    [orgs, loggedIn]
  );

  // This service worker appends the Firebase Authentication JWT to all of our
  // same-origin fetch requests. In the future, it'll handle caching as well.
  useEffect(() => {
    void installServiceWorker();
  }, []);

  // Dynamically import our Firebase SDK initialization (because it's so big) to
  // connect Google Analytics with our Firebase project automatically.
  useEffect(() => {
    const initFirebaseAndAnalytics = () => import('lib/firebase');
    void initFirebaseAndAnalytics();
  }, []);

  return (
    <SWRConfig value={{ fetcher }}>
      <UserContext.Provider
        value={{ user, orgs, updateUser, updateOrg, loggedIn }}
      >
        <NProgress />
        <div id='portal' />
        <Component {...pageProps} />
      </UserContext.Provider>
    </SWRConfig>
  );
}
