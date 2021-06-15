import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { SWRConfig, mutate } from 'swr';
import { AppProps } from 'next/app';
import axios from 'axios';

import NProgress from 'components/nprogress';

import { Org, OrgJSON } from 'lib/model';
import { Theme, ThemeContext } from 'lib/context/theme';
import { UpdateOrgParam, UpdateUserParam, UserContext } from 'lib/context/user';
import { User, UserJSON } from 'lib/model';
import { APIError } from 'lib/api/error';
import { fetcher } from 'lib/fetch';
import useTrack from 'lib/hooks/track';

import 'styles/global.scss';

export default function App({ Component, pageProps }: AppProps): JSX.Element {
  // The user account state must be defined as a hook here. Otherwise, it gets
  // reset during client-side page navigation.
  const userLoaded = useRef<boolean>(false);
  const { data, error } = useSWR<UserJSON, APIError>('/api/account', fetcher);
  // TODO: Hoist the i18n locale to the top-level of the app (or trigger an
  // effect from within the `withI18n` HOC) to properly set these `langs`.
  const user = useMemo(
    () =>
      data
        ? User.fromJSON(data)
        : new User({
            langs: ['en'],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
    [data]
  );
  const loggedIn = useMemo(() => {
    if (user.id) {
      userLoaded.current = true;
      return true;
    }
    if (error) {
      userLoaded.current = true;
      return false;
    }
    if (!userLoaded.current) return undefined;
    return false;
  }, [user, error]);
  const updateUser = useCallback(
    async (param: UpdateUserParam) => {
      let updated: User = user;
      if (typeof param === 'object') updated = new User(param);
      if (typeof param === 'function') updated = new User(param(user));
      // Re-validate if we haven't gotten any account data yet. This fixes
      // an issue where the profile view would locally update to an empty
      // `User()` *before* our `/api/account` endpoint could respond. SWR
      // cancelled the `/api/account` mutation in favor of the empty one.
      await mutate('/api/account', updated.toJSON(), loggedIn === undefined);
      if (updated.id)
        await mutate(`/api/users/${updated.id}`, updated.toJSON(), false);
    },
    [user, loggedIn]
  );

  // Update the currently signed-in user's timezone if it has changed.
  // @see {@link https://stackoverflow.com/a/34602679/10023158}
  useEffect(() => {
    void updateUser((prev) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (prev.timezone === timezone || !prev.id) return prev;
      const updated = new User({ ...prev, timezone });
      void axios.put<UserJSON>('/api/account', updated.toJSON());
      return updated;
    });
  }, [updateUser]);

  // Only trigger the `User Signed In` event if the user was logged out before.
  const track = useTrack();
  const prevLoggedIn = useRef<boolean | undefined>(loggedIn);
  useEffect(() => {
    if (loggedIn === true && prevLoggedIn.current === false) {
      track('User Signed In', user.toSegment());
    } else if (loggedIn === false && prevLoggedIn.current === true) {
      track('User Signed Out');
    }
    prevLoggedIn.current = loggedIn;
  }, [track, user, loggedIn]);

  // Consumers can update local app-wide org data (proxy to SWR's mutate FN).
  const { data: orgsData } = useSWR<OrgJSON[], APIError>('/api/orgs', fetcher);
  const orgs = useMemo(
    () => (orgsData ? orgsData.map((o) => Org.fromJSON(o)) : []),
    [orgsData]
  );
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
      await mutate('/api/orgs', updated, loggedIn === undefined);
    },
    [orgs, loggedIn]
  );

  // Initially set theme using system preferences, cache settings when changed.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'system';
    return localStorage.getItem('theme') as Theme;
  });
  const [dark, setDark] = useState<boolean>(theme === 'dark');

  useEffect(() => {
    let isDark = theme === 'dark';
    if (theme === 'system') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.matches) isDark = true;
    }
    setDark(isDark);
  }, [theme]);
  useEffect(() => {
    if (dark) return document.documentElement.classList.add('dark');
    return document.documentElement.classList.remove('dark');
  }, [dark]);
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ dark, theme, setTheme }}>
      <SWRConfig value={{ fetcher }}>
        <UserContext.Provider
          value={{ user, orgs, updateUser, updateOrg, loggedIn }}
        >
          <NProgress />
          <div id='portal' />
          <Component {...pageProps} />
        </UserContext.Provider>
      </SWRConfig>
    </ThemeContext.Provider>
  );
}
