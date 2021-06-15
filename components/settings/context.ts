import { createContext, useContext } from 'react';

import { Callback, CallbackParam } from 'lib/model/callback';
import { Org } from 'lib/model/org';

export interface SettingsContextValue {
  org: Org;
  setOrg: Callback<Org>;
}

export const SettingsContext = createContext<SettingsContextValue>({
  org: Org.parse({}),
  setOrg: (org: CallbackParam<Org>) => {},
});

export const useSettings = () =>
  useContext<SettingsContextValue>(SettingsContext);
