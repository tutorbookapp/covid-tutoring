import { createContext, useContext } from 'react';

import { Org } from 'lib/model';

// TODO: Replace this object with just the `Org` object itself to prevent
// unnecessary updates. See: https://reactjs.org/docs/context.html#caveats
export interface OrgContextValue {
  org?: Org;
}

export const OrgContext = createContext<OrgContextValue>({});

export const useOrg = () => useContext<OrgContextValue>(OrgContext);
