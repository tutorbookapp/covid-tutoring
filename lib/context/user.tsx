import { createContext, useContext } from 'react';

import { Org, OrgInterface } from 'lib/model';
import { User, UserInterface } from 'lib/model';

export type UpdateUserParam = UserInterface | ((prev: User) => UserInterface);
export type UpdateOrgParam = OrgInterface | ((prev: Org) => OrgInterface);

export interface UserContextValue {
  user: User;
  orgs: Org[];
  updateUser: (user: UpdateUserParam) => Promise<void>;
  updateOrg: (orgId: string, org: UpdateOrgParam) => Promise<void>;
  loggedIn?: boolean;
}

export const UserContext = createContext<UserContextValue>({
  user: User.parse({}),
  orgs: [],
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  updateUser: async (user: UpdateUserParam) => {},
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  updateOrg: async (orgId: string, org: UpdateOrgParam) => {},
  loggedIn: undefined,
});

export const useUser = () => useContext<UserContextValue>(UserContext);
