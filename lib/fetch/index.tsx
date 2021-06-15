import axios, { AxiosError, AxiosResponse } from 'axios';
import { useMemo, useState } from 'react';
import { mutate } from 'swr';
import to from 'await-to-js';
import useTranslation from 'next-translate/useTranslation';

import { APIError, APIErrorJSON } from 'lib/api/error';
import { Callback } from 'lib/model';
import { period } from 'lib/utils';

export async function fetcher<T>(url: string): Promise<T> {
  const [err, res] = await to<AxiosResponse<T>, AxiosError<APIErrorJSON>>(
    axios.get<T>(url)
  );
  if (err && err.response) {
    const msg = `API (${url}) responded with error: ${err.response.data.message}`;
    throw new APIError(msg, err.response.status);
  } else if (err && err.request) {
    throw new APIError(`API (${url}) did not respond.`);
  } else if (err) {
    throw new APIError(`${err.name} calling API (${url}): ${err.message}`);
  }
  return (res as AxiosResponse<T>).data;
}

export async function prefetch(url: string): Promise<void> {
  await mutate(url, fetcher(url));
}

// The given `action` string should be formatted like: "sending your request."
export function getErrorMessage(
  error: AxiosError<APIErrorJSON>,
  action: string,
  t: (key: string, query?: Record<string, string>) => string
): string {
  let msg = '';
  if (error && error.response) {
    const e = error.response.data || error;
    msg = t('error:response', { action, error: period(e.message) });
  } else if (error && error.request) {
    msg = t('error:no-response', { action });
  } else if (error) {
    msg = t('error:no-request', { action, error: period(error.message) });
  }
  return msg;
}

export interface ErrorProps {
  error: string;
  setError: Callback<AxiosError<APIErrorJSON> | undefined>;
}

export function useError(action: string): ErrorProps {
  const [error, setError] = useState<AxiosError<APIErrorJSON>>();

  const { t } = useTranslation();
  const message = useMemo(() => {
    return error ? getErrorMessage(error, action, t) : '';
  }, [error, action, t]);

  return { error: message, setError };
}
