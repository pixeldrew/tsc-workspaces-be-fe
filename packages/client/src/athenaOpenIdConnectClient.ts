import { createRemoteJWKSet, jwtVerify } from 'jose';

import {
    JWKS_URL,
    TOKEN_URL,
    AUTHORIZE_URL,
    TOKEN_INTROSPECTION_URL,
} from './auth-constants';
import { b64u, buf } from './string-utils';

const code_challenge_method = 'S256';

interface TokensResponseBody {
    token_type: string;
    expires_in: number;
    access_token: string;
    scope: string;
    refresh_token?: string;
    id_token?: string;
    patient?: string;
    ah_department?: string;
    smart_style_url?: string;
    ah_brand?: string;
    ah_csg?: string;
    need_patient_banner?: boolean;
    ah_practice?: string;
    username?: string;
    fhir_user_reference?: string;
}

interface InspectResponseBody {
    active: string;
    exp: number;
    scope: string;
}

interface ConfigOptions {
    clientId: string;
    scopes: string;
    redirectUri: string;
    apiHost: string;
}

export interface TokenContext {
    patient?: string;
    ah_department?: string;
    smart_style_url?: string;
    ah_brand?: string;
    ah_csg?: string;
    need_patient_banner?: boolean;
    ah_practice?: string;
    username?: string;
    fhir_user_reference?: string;
}
export interface AthenaOpenIdConnectClient {
    getAccessToken: () => Promise<string | null>;
    tokenStore: {
        setItem: (key: string, value: string) => void;
        getItem: (key: string) => string | null;
        removeItem: (key: string) => void;
        clearAuthCodeState: () => void;
        logOut: () => void;
    };
}

export const athenaOpenIdConnectClient = async ({
    clientId,
    scopes,
    redirectUri,
    apiHost,
}: ConfigOptions): Promise<AthenaOpenIdConnectClient> => {
    const scopesHash = Array.from(
        new Uint8Array(await window.crypto.subtle.digest('SHA-1', buf(scopes))),
    )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''); // convert bytes to hex string
    const storePrefix = `${clientId}-${scopesHash.slice(0, 8)}`;
    const hostUrl = new URL(`https://${apiHost}`);

    const api = async (
        path: string,
        params: Record<string, string> | null,
        options?: RequestInit,
    ) => {
        const requestHeaders: HeadersInit = new Headers(options?.headers);

        if (params && !requestHeaders.has('Content-Type')) {
            requestHeaders.set(
                'Content-Type',
                'application/x-www-form-urlencoded',
            );
        }

        const fetchOptions: RequestInit = {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            ...options,
            headers: requestHeaders,
        };

        if (
            params &&
            requestHeaders.get('Content-Type') ===
                'application/x-www-form-urlencoded'
        ) {
            fetchOptions.body = new URLSearchParams(params);
        }

        const response = await fetch(
            new URL(hostUrl.protocol + '//' + hostUrl.hostname + path),
            fetchOptions,
        );

        if (!response.ok) {
            throw new Error(`Response status: ${response.status.toString()}`);
        }

        return response;
    };

    const createTokenStore = (storePrefix: string) => {
        const setItem = (key: string, value: string) => {
            localStorage.setItem(`${storePrefix}-${key}`, value);
        };

        const getItem = (key: string): string | null =>
            localStorage.getItem(`${storePrefix}-${key}`);

        const removeItem = (key: string) => {
            localStorage.removeItem(`${storePrefix}-${key}`);
        };

        const clearAuthCodeState = () => {
            removeItem(`cv`);
            removeItem(`nonce`);
            removeItem(`state`);
        };

        const logOut = () => {
            removeItem(`id`);
            removeItem(`tc`);
            removeItem(`at`);
            removeItem(`expires_in`);
        };

        return { setItem, getItem, removeItem, clearAuthCodeState, logOut };
    };

    const inspectToken = async (
        refreshToken: string,
    ): Promise<InspectResponseBody> => {
        const inspectParams: Record<string, string> = {
            token: refreshToken,
            token_type_hint: 'refresh_token',
        };
        const inspectResponse = await api(
            TOKEN_INTROSPECTION_URL,
            inspectParams,
        );

        return (await inspectResponse.json()) as InspectResponseBody;
    };

    const reFetchTokens = async (
        scope: string,
        refreshToken: string,
    ): Promise<string> => {
        const parameters: Record<string, string> = {
            client_id: clientId,
            grant_type: 'refresh_token',
            redirect_uri: redirectUri,
            scope,
            refresh_token: refreshToken,
        };

        const tokensResponse = await api(TOKEN_URL, parameters);

        const { access_token, expires_in, id_token, ...tokenBody } =
            (await tokensResponse.json()) as TokensResponseBody;

        const tokenStore = createTokenStore(
            `${clientId}-${encodeURIComponent(scope)}`,
        );
        tokenStore.setItem('at', access_token);
        tokenStore.setItem(
            'expires_in',
            JSON.stringify(new Date().valueOf() + expires_in * 1000),
        );

        if (scope.includes('openid') && id_token) {
            tokenStore.setItem('id', id_token);
        }

        tokenStore.setItem('tc', JSON.stringify(tokenBody));

        return access_token;
    };

    const handleAuthorizationFlow = async (
        tokenStore: ReturnType<typeof createTokenStore>,
    ) => {

        if(clientId === 'unknown') {
            throw new Error('client id is not set');
        }

        if (!tokenStore.getItem(`cv`)) {
            if (
                !document.location.search.includes('iss=') ||
                !document.location.search.includes('launch=')
            ) {
                throw new Error(
                    'missing required embed params in url (iss,launch)',
                );
            }
            await redirectToAuthorization(tokenStore);
        }

        if (document.location.search.includes('code=')) {
            // verify state param
            const state = tokenStore.getItem(`state`);
            const params = new URLSearchParams(document.location.search);

            if (state == params.get('state')) {
                await fetchNewTokens(tokenStore);
            } else {
                throw new Error(
                    'state param does not match, possible csrf attack',
                );
            }
        }

        if (document.location.search.includes('error=')) {
            // log error and do something different
            const searchParams = new URLSearchParams(document.location.search);
            tokenStore.clearAuthCodeState();
            throw new Error(
                `error in authorization flow ${searchParams.get('error') ?? ''}`,
            );
        }
    };

    const redirectToAuthorization = async (
        tokenStore: ReturnType<typeof createTokenStore>,
    ) => {
        const code_verifier = b64u(crypto.getRandomValues(new Uint8Array(32)));
        const code_challenge = b64u(
            await crypto.subtle.digest('SHA-256', buf(code_verifier)),
        );

        const launch =
            new URLSearchParams(document.location.search).get('launch') ?? '';
        const nonce = b64u(crypto.getRandomValues(new Uint8Array(32)));
        // save current location to state so we can redirect later
        const state = b64u(
            buf(
                JSON.stringify({
                    redirectTo: document.location.toString(),
                    xcrf: b64u(crypto.getRandomValues(new Uint8Array(8))),
                }),
            ),
        );

        const parameters: Record<string, string> = {
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            aud: new URLSearchParams(document.location.search).get('iss') ?? '',
            code_challenge,
            code_challenge_method,
            state,
            nonce,
            launch,
        };

        const redirectTo = new URL(
            `https://${apiHost + AUTHORIZE_URL}?${new URLSearchParams(parameters).toString()}`,
        );

        tokenStore.setItem(`cv`, code_verifier);
        tokenStore.setItem(`nonce`, nonce);
        tokenStore.setItem(`state`, state);

        console.log('redirecting to', redirectTo.href);

        document.location.href = redirectTo.href;
    };

    const fetchNewTokens = async (
        tokenStore: ReturnType<typeof createTokenStore>,
    ) => {
        const nonce = tokenStore.getItem(`nonce`) ?? '';

        const parameters: Record<string, string> = {
            client_id: clientId,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            scope: scopes,
            code:
                new URLSearchParams(document.location.search).get('code') ?? '',
            code_verifier: tokenStore.getItem(`cv`) ?? '',
        };

        // fetch tokens
        const tokensResponse = await api(TOKEN_URL, parameters);

        if (!tokensResponse.ok) {
            throw new Error(
                `Response status: ${tokensResponse.status.toString()}`,
            );
        }

        const {
            access_token,
            refresh_token,
            expires_in,
            id_token,
            ...tokenBody
        } = (await tokensResponse.json()) as TokensResponseBody;

        // validate tokens
        const JWKS = createRemoteJWKSet(
            new URL(`https://${apiHost}${JWKS_URL}?client_id=${clientId}`),
        );
        await jwtVerify(access_token, JWKS);

        if (scopes.includes('openid') && id_token) {
            const { payload: idTokenClaims } = await jwtVerify(id_token, JWKS);

            if (idTokenClaims.nonce != nonce) {
                throw new Error('nonce does not match');
            }

            if (idTokenClaims.aud != clientId) {
                throw new Error('audience and client id do not match');
            }
        }

        tokenStore.setItem('at', access_token);
        tokenStore.setItem(
            'expires_in',
            JSON.stringify(
                new Date(Date.now().valueOf() + expires_in * 1000).valueOf(),
            ),
        );

        if (id_token) {
            tokenStore.setItem('id', id_token);
        }

        if (scopes.includes('offline') && refresh_token) {
            tokenStore.setItem('rt', refresh_token);
        }

        tokenStore.setItem('tc', JSON.stringify(tokenBody));

        // cleanup authorize flow
        tokenStore.clearAuthCodeState();

        history.replaceState(
            null,
            '',
            document.location
                .toString()
                .replace(/code=([^&]*)/, '')
                .replace(/state=([^&]*)/, ''),
        );
    };

    const tokenStore = createTokenStore(storePrefix);

    const refreshToken = async (refreshToken: string) => {
        const inspect = await inspectToken(refreshToken);
        return await reFetchTokens(inspect.scope, refreshToken);
    };

    // if no token, redirect user through auth flow
    if (!tokenStore.getItem(`at`)) {
        await handleAuthorizationFlow(tokenStore);
    }

    // fetch the token from the store and validate that it's good
    const getAccessToken = async (): Promise<string | null> => {
        let accessToken = tokenStore.getItem(`at`);
        const expiresIn = parseInt(
            tokenStore.getItem(`expires_in`) ?? Date.now().valueOf().toString(),
            10,
        );

        if (
            scopes.includes('offline') &&
            accessToken &&
            Date.now().valueOf() >= expiresIn
        ) {
            const refToken = tokenStore.getItem(`rt`);
            if (refToken) {
                accessToken = await refreshToken(refToken);
            } else {
                throw new Error('no refresh Token available');
            }
        }

        if (!accessToken) {
            throw new Error('no access token available, not logged in');
        }

        return accessToken;
    };

    return { getAccessToken, tokenStore };
};
