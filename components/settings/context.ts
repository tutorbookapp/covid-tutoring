import { createContext, useContext } from 'react';

import { Callback, CallbackParam } from 'lib/model';
import { Org } from 'lib/model';

export interface SettingsContextValue {
  org: Org;
  setOrg: Callback<Org>;
}

export const SettingsContext = createContext<SettingsContextValue>({
  org: new Org(),
  setOrg: (org: CallbackParam<Org>) => {},
});

export const useSettings = () =>
  useContext<SettingsContextValue>(SettingsContext);
