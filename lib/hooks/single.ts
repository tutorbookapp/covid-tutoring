import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { dequal } from 'dequal/lite';
import to from 'await-to-js';

import { APIErrorJSON } from 'lib/api/error';
import { Callback } from 'lib/model/callback';
import { Validations } from 'lib/context/validations';

interface SingleProps<T> {
  data: T;
  setData: Callback<T>;
  validations: Validations;
  setValidations: Callback<Validations>;
  onSubmit: (evt?: FormEvent) => Promise<void>;
  loading: boolean;
  setLoading: Callback<boolean>;
  checked: boolean;
  setChecked: Callback<boolean>;
  error: string;
  setError: Callback<string>;
}

/**
 * @typedef {Object} SingleOptions
 * @description Options for the `useSingle` hook (passed as last argument).
 * @property [sync] - When true, the local data is kept in sync (using
 * `updateLocal`) with the current state. Defaults to false.
 * @property [throttle] - The timeout between `updateLocal` calls. Defaults to
 * 500ms (i.e. wait for 500ms of no-change before calling `updateLocal`).
 */
export interface SingleOptions {
  sync?: boolean;
  throttle?: number;
}

/**
 * React hook that implements the single update form data flow. Upon explicit
 * user submission:
 * 1. Show a loading state.
 * 2. Immediately mutate local data.
 * 3. Update remote data with POST or PUT API request.
 * 4. If the server sends an error, reset local data and show error message.
 * 5. Otherwise, mutate local data with the server's response.
 * 6. Hide the loading state. Data has been updated or an error has occurred.
 * @see {@link https://github.com/tutorbookapp/tutorbook#forms-and-data-mutation}
 * @todo Locally mutating data before updating the remote makes changes feel
 * faster but having a loader visible defeats that purpose. Should we even
 * locally mutate data first, then? Or should we hide the loader before the
 * remote is properly updated?
 */
export default function useSingle<T>(
  initialData: T,
  updateRemote: (data: T) => Promise<T | void>,
  updateLocal?: (
    data: T,
    hasBeenUpdated: boolean,
    dataSentToAPI: T
  ) => Promise<void> | void,
  options?: SingleOptions
): SingleProps<T> {
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [validations, setValidations] = useState<Validations>({});

  // The given changes are always initially saved; we don't want to show an
  // unnecessary "Saved changes" snackbar when the user first opens a page.
  const lastReceivedResponse = useRef<T>(initialData);

  const onSubmit = useCallback(
    async (evt?: FormEvent) => {
      // Validate submission data.
      if (evt) evt.preventDefault();
      if (Object.values(validations).some((v) => !v())) return;
      // Show a loading state.
      setError('');
      setChecked(false);
      setLoading(true);
      // Immediately mutate local data.
      if (updateLocal) await updateLocal(data, false, data);
      // Update remote data with POST or PUT API request.
      const [err, res] = await to(updateRemote(data));
      if (err) {
        // Hide the loading state, error has been received.
        setLoading(false);
        // If the server sends an error, show error message.
        const e = (err as AxiosError<APIErrorJSON>).response?.data || err;
        setError(e.message);
      } else {
        // Otherwise, mutate local data with the server's response.
        if (res && !dequal(res, data)) {
          lastReceivedResponse.current = res;
          setData(res);
          // TODO: This is unnecessary if `options.sync` is true.
          if (updateLocal) await updateLocal(res, true, data);
        } else if (updateLocal) {
          // Signal that local data is now in sync with server data.
          await updateLocal(data, true, data);
        }
        setChecked(true);
        // Hide the loading state. Data has been updated.
        setTimeout(() => setLoading(false), 1000);
      }
    },
    [updateLocal, updateRemote, data, validations]
  );

  useEffect(() => {
    // Initial data takes precedence over local component-scoped data (e.g. when
    // editing a profile that can be updated from multiple locations).
    setData((prev: T) => {
      if (dequal(prev, initialData)) return prev;
      lastReceivedResponse.current = initialData;
      return initialData;
    });
  }, [initialData]);

  useEffect(() => {
    if (!options?.sync || !updateLocal) return;
    const throttle = options.throttle || 500;
    const timeoutId = setTimeout(() => {
      void updateLocal(data, dequal(lastReceivedResponse.current, data), data);
    }, throttle);
    return () => clearTimeout(timeoutId);
  }, [data, updateLocal, options]);

  return {
    data,
    setData,
    validations,
    setValidations,
    onSubmit,
    error,
    setError,
    loading,
    setLoading,
    checked,
    setChecked,
  };
}
