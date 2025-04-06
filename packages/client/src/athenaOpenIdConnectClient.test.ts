import {
    describe,
    beforeAll,
    it,
    afterAll,
    vi,
    expect,
    afterEach,
} from 'vitest';
import {
    athenaOpenIdConnectClient,
    AthenaOpenIdConnectClient,
} from './athenaOpenIdConnectClient'; // Adjust the import path as necessary

import { server } from './__mocks__/node';

vi.mock('jose');

describe('athenaOpenIdConnectClient', () => {
    const config = {
        clientId: 'test-client-id',
        scopes: 'test-scope openid',
        redirectUri: 'http://localhost:3000/',
        apiHost: 'api.oauthtest.com',
        practiceId: '12345',
    };

    let client: AthenaOpenIdConnectClient;

    // make random values deterministic
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((ta) => ta);

    // Start server before all tests
    beforeAll(() => {
        server.listen({ onUnhandledRequest: 'error' });
    });

    // Close server after all tests
    afterAll(() => {
        server.close();
    });

    // Reset handlers after each test for test isolation
    afterEach(() => {
        server.resetHandlers();
    });

    it('should initialize the client and redirect through to authorization endpoint passing code_challenge', async () => {
        window.location.href =
            'http://localhost:3000/?iss=happy-dom&launch=mocked-launch';

        client = await athenaOpenIdConnectClient(config);
        expect(client).toBeDefined();
        expect(client.getAccessToken).toBeInstanceOf(Function);

        // should expect that document.location is set to the authorization URL
        expect(window.location.href).toBe(
            'https://api.oauthtest.com/oauth2/v1/authorize?' +
                'client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F' +
                '&response_type=code&scope=test-scope+openid&aud=happy-dom' +
                '&code_challenge=DwBzhbb51LfusnSGBa_hqYSgo7-j8BTQnip4TOnlzRo&code_challenge_method=S256' +
                '&state=eyJyZWRpcmVjdFRvIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwLz9pc3M9aGFwcHktZG9tJmxhdW5jaD1tb2NrZWQtbGF1bmNoIiwieGNyZiI6IkFBQUFBQUFBQUFBIn0' +
                '&nonce=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&launch=mocked-launch',
        );
    });

    it('should handle return from authorization', async () => {
        const mockedState = 'test-state';

        // mock localstorage
        const getItemMock = vi
            .spyOn(global.localStorage, 'getItem')
            .mockImplementation((key) => {
                if (key.includes('state')) {
                    return mockedState;
                }
                return key.includes('cv') || key.includes('nonce')
                    ? 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
                    : null;
            });

        window.location.href = `http://localhost:3000/?state=${mockedState}&code=mocked-code`;

        vi.spyOn(global.localStorage, 'setItem');

        client = await athenaOpenIdConnectClient(config);

        getItemMock.mockReset();
        await client.getAccessToken();

        expect(client.tokenStore.getItem('at')).toBe('test-access-token');
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });
});
