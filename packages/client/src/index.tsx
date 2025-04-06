import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import {
    REDIRECT_URI,
    CLIENT_ID,
    SCOPES,
    ATHENA_API_HOST,
} from './auth-constants';

import './index.css';
import App from './App';
import { athenaOpenIdConnectClient, TokenContext } from './athenaOpenIdConnectClient';

const getTokenBody = (token: string) =>
  JSON.parse(buf(b64u(token.split('.')[1]))) as TokenBody;

import { b64u, buf } from './string-utils';

let tokenStore;
let logOut;

const clientId = import.meta.env.VITE_ATHENA_CLIENT_ID ?? CLIENT_ID
try {
    const athenaConfig = {
        clientId,
        scopes: import.meta.env.VITE_ATHENA_SCOPES ?? SCOPES,
        redirectUri: import.meta.env.VITE_REDIRECT_URI ?? REDIRECT_URI,
        apiHost: import.meta.env.VITE_ATHENA_API_HOST ?? ATHENA_API_HOST,
    };
    ({ tokenStore } = await athenaOpenIdConnectClient(athenaConfig));

    logOut = tokenStore.logOut

} catch (e) {
    console.error('Error initializing OpenID Connect client', e);
}

let idToken: IdToken;
let tokenContext;

if(clientId === "unknown") {
    console.warn('athena client id is not set. defaulting to demo mode');

    logOut = () => null;

    tokenContext = {
        patient: 'a-????.E-????',
    };

    idToken = {
        iss: 'https://api.oauthtest.com',
        aud: clientId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-subject',
        scope: 'DEMO',
        nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        name: 'DEMO PROVIDER',
        preferred_username: 'DEMO_USER',
        fhirUser: 'https://api.preview.platform.athenahealth.com/fhir/r4/Practitioner/a-????.User-????'
    }
}

// if client is configured and there is an access token
if (tokenStore?.getItem('at')) {
    const idTokenString = tokenStore.getItem('id');

    if (idTokenString) {
        idToken = getTokenBody(idTokenString) as IdToken;
    }

    tokenContext = JSON.parse(tokenStore.getItem('tc') ?? "{}") as TokenContext;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App scopes={SCOPES} idToken={idToken} patient={tokenContext.patient} logOut={logOut} />
  </StrictMode>,
);
