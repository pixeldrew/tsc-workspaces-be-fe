import { vi } from 'vitest';

const createRemoteJWKSet = vi.fn().mockResolvedValue({
    toJSON: () => ({
        keys: [
            {
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-id',
                alg: 'RS256',
                n: 'test-modulus',
                e: 'AQAB',
            },
        ],
    }),
});

const jwtVerify = vi.fn().mockResolvedValue({
    payload: {
        iss: 'https://api.oauthtest.com',
        aud: 'test-client-id',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-subject',
        scope: 'openid test-scope',
        nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
});

export { createRemoteJWKSet, jwtVerify };
