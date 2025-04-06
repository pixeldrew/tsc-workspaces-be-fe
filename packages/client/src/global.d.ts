interface TokenBody {
    aud: string;
    iss: string;
}

interface IdToken extends TokenBody {
    name: string;
    preferred_username: string;
    fhirUser: string;
    [key: string]: unknown;
}
