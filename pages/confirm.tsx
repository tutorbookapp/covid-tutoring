import Router, { useRouter } from 'next/router';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';
import to from 'await-to-js';
import useTranslation from 'next-translate/useTranslation';

import { EmptyHeader } from 'components/navigation';
import Notification from 'components/notification';
import Page from 'components/page';

import { PageProps, getPageProps } from 'lib/page';
import { User, UserJSON } from 'lib/model';
import { APIErrorJSON } from 'lib/api/error';
import useLoginPage from 'lib/hooks/login-page';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import confirm from 'locales/en/confirm.json';

function ConfirmPage(props: PageProps): JSX.Element {
  // TODO: Update or replace `next-translate` i18n solution because `t` keeps
  // changing which prevents us from using it in the `loginWithEmail` effect.
  const { t } = useTranslation();
  const { query } = useRouter();

  useLoginPage({ name: 'Confirm' });

  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!error) return;
    void Router.push({
      pathname: '/authentication-failed',
      query: { error, href: query.href },
    });
  }, [error, query.href]);

  useEffect(() => {
    // TODO: Abort if the page has been unmounted (so that we don't have state
    // updates on unmounted components). See: https://bit.ly/37Fp4WT
    async function loginWithEmail(): Promise<void> {
      const { default: firebase } = await import('lib/firebase');
      await import('firebase/auth');
      const auth = firebase.auth();
  
      // As cookies are to be used, do not persist any state client side.
      // @see {@link https://firebase.google.com/docs/auth/admin/manage-cookies}
      auth.setPersistence(firebase.auth.Auth.Persistence.NONE);

      if (!auth.isSignInWithEmailLink(window.location.href))
        return setError(confirm['invalid-link']);
      const email = localStorage.getItem('email');
      if (!email) return setError(confirm['no-email']);
      const [signInErr, cred] = await to(auth.signInWithEmailLink(email));
      if (signInErr || !cred?.user) return setError(signInErr?.message || '');
      const user = User.parse({
        id: cred.user.uid,
        name: cred.user.displayName as string,
        photo: cred.user.photoURL as string,
        email: cred.user.email as string,
        phone: cred.user.phoneNumber as string,
      });

      // Create the Firestore profile document (we cannot call the 
      // `POST /api/users` endpoint because the Firebase Authentication account 
      // already exists). This also sets the authentication cookie because we 
      // passed it the ID token.
      const token = await cred.user.getIdToken();
      const [err, res] = await to<
        AxiosResponse<UserJSON>,
        AxiosError<APIErrorJSON>
      >(axios.put('/api/account', { ...user.toJSON(), token }));

      let e: string | undefined;
      if (err && err.response) e = err.response.data.message;
      if (err && err.request) e = 'Users API did not respond.';
      if (err) e = `Error calling user API: ${err.message}`;
      if (e) return setError(e);
      
      const { data } = res as AxiosResponse<UserJSON>;
      await mutate('/api/account', data, false);
      
      return localStorage.removeItem('email');
    }

    void loginWithEmail();
  }, []);

  return (
    <Page title='Confirming Login - Tutorbook' {...props}>
      <EmptyHeader />
      <Notification header={t('confirm:header')}>
        <p>{t('confirm:body')}</p>
      </Notification>
    </Page>
  );
}

export const getStaticProps = getPageProps;

export default withI18n(ConfirmPage, { common, confirm });
