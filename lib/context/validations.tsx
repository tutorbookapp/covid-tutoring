import { createContext, useContext } from 'react';

import { Callback, CallbackParam } from 'lib/model';

export type Validations = Record<string, () => boolean>;
export interface ValidationsContextType {
  validations: Validations;
  setValidations: Callback<Validations>;
}

// React context that allows input-like components to override the default
// browser form submission validation (e.g. when uploading photos).
export const ValidationsContext = createContext<ValidationsContextType>({
  validations: {},
  setValidations: (param: CallbackParam<Validations>) => {},
});

export function useValidations(): ValidationsContextType {
  return useContext(ValidationsContext);
}
