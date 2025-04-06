import { http, HttpResponse } from 'msw';

export const handlers = [
    // Intercept "POST https://api.oauthtest.com/oauth2/v1/token" requests...
    http.post('https://api.oauthtest.com/oauth2/v1/token', () => {
        // ...and respond to them using this JSON response.
        return HttpResponse.json({
            token_type: 'Bearer',
            expires_in: '3600',
            access_token: 'test-access-token',
            scope: 'test-scope openid',
            id_token: 'test-id-token',
            patient: 'a-??.E-?',
            ah_department: 'a-2960103.Department-330',
            smart_style_url:
                'https://preview.athenahealth.com/static/smart_on_fhir/smart_stylesheet_v1.json',
            ah_brand: 'a-??.Brand-?',
            ah_csg: 'a-??.CSG-?',
            need_patient_banner: true,
            ah_practice: 'a-?.Practice-??',
            username: 'test-user',
            fhir_user_reference: 'Practitioner/a-?.User-??',
        });
    }),
];
