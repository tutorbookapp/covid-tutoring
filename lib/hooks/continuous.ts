import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { dequal } from 'dequal/lite';
import { nanoid } from 'nanoid';
import to from 'await-to-js';

import { APIErrorJSON } from 'lib/api/error';
import { Callback } from 'lib/model';

interface ContinuousProps<T> {
  data: T;
  setData: Callback<T>;
  loading: boolean;
  checked: boolean;
  error: string;
  timeout: number;
  retry: () => Promise<void>;
}

/**
 * React hook that implements the continuous update form data flow. On change:
 * 1. Immediately mutate local data. Show an "Updating..." snackbar.
 * 2. Set a timeout to update the remote data. Clear any existing timeouts.
 * 3. Update the remote data with a POST or PUT API request.
 * 4. If the server sends an error, show an error message and use exponential
 *    backoff to continually retry the request. Local data stays mutated.
 * 5. Otherwise, mutate local data with the server's response. Show an "Updated"
 *    snackbar.
 * @see {@link https://github.com/tutorbookapp/tutorbook#forms-and-data-mutation}
 * @todo Find some way to skip the initial update (when the `data` state is what
 * we just fetched from our back-end API).
 */
export default function useContinuous<T>(
  initialData: T,
  updateRemote: (data: T) => Promise<T | void>,
  updateLocal?: (data: T, hasBeenUpdated?: boolean) => Promise<void> | void
): ContinuousProps<T> {
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // The given changes are always initially saved; we don't want to show an
  // unnecessary "Saved changes" snackbar when the user first opens a page.
  const lastReceivedResponse = useRef<T>(initialData);

  // Don't mutate data with server response if local data has changed since we
  // sent the POST or PUT API request.
  const currentRequestId = useRef<string>('');

  const sendRequest = useCallback(
    async (requestId: string) => {
      // Show a loading state.
      setError('');
      setChecked(false);
      setLoading(true);
      // Update remote data with POST or PUT API request.
      const [err, res] = await to(updateRemote(data));
      // Don't mutate data with server response if local data has changed.
      if (currentRequestId.current !== requestId) return;
      if (err) {
        // Hide the loading state, error has been received.
        setLoading(false);
        // If the server sends an error, show error message.
        const e = (err as AxiosError<APIErrorJSON>).response?.data || err;
        setError(e.message);
        setRetryCount((prev: number) => prev + 1);
      } else {
        // Otherwise, mutate local data with the server's response.
        setRetryCount(0);
        if (res && !dequal(res, data)) {
          lastReceivedResponse.current = res;
          setData(res);
        } else if (updateLocal) {
          // Signal that local data is now in sync with server data.
          await updateLocal(data, true);
        }
        setChecked(true);
        // Hide the loading state. Data has been updated.
        setTimeout(() => setLoading(false), 1000);
      }
    },
    [updateLocal, updateRemote, data]
  );

  const timeout = useMemo(() => {
    // Exponential backoff equation taken from the @vercel/swr source code.
    // TODO: Use existing retry libraries instead (don't reinvent the wheel).
    // @see {@link https://github.com/vercel/async-retry}
    // @see {@link https://github.com/tim-kos/node-retry}
    const initialTimeout = 5000;
    const count = Math.min(retryCount, 8);
    // eslint-disable-next-line no-bitwise
    const backoff = ~~((Math.random() + 0.5) * (1 << count)) * initialTimeout;
    // Never go below the initial timeout (i.e. never immediately update data).
    return Math.max(backoff, initialTimeout);
  }, [retryCount]);

  useEffect(() => {
    // Don't update remote data for unidentified resource.
    if (((data as unknown) as { id: string })?.id === '') return;
    // Don't update remote with the response the remote sent us.
    if (dequal(lastReceivedResponse.current, data)) return;
    // Immediately show loading state (if there isn't an error).
    if (!error) {
      setError('');
      setChecked(false);
      setLoading(true);
    }
    // Update the remote data after a period of no change.
    const requestId = nanoid();
    const timeoutId = setTimeout(
      () => {
        void sendRequest(requestId);
      },
      error ? timeout : 500
    );
    currentRequestId.current = requestId;
    return () => clearTimeout(timeoutId);
  }, [error, data, sendRequest, timeout]);

  useEffect(() => {
    if (!updateLocal) return;
    // Don't update local data for unidentified resource.
    if (((data as unknown) as { id: string })?.id === '') return;
    // Throttle local updates (one sec) to prevent unecessary large re-renders.
    const timeoutId = setTimeout(() => {
      void updateLocal(data, dequal(lastReceivedResponse.current, data));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [updateLocal, data]);

  useEffect(() => {
    // Initial data takes precedence over local component-scoped data (e.g. when
    // editing a profile that can be updated from multiple locations).
    setData((prev: T) => {
      if (dequal(prev, initialData)) return prev;
      lastReceivedResponse.current = initialData;
      return initialData;
    });
  }, [initialData]);

  const retry = useCallback(() => {
    const requestId = nanoid();
    currentRequestId.current = requestId;
    return sendRequest(requestId);
  }, [sendRequest]);

  return { data, setData, loading, checked, error, retry, timeout };
}
