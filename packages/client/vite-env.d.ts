/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ATHENA_CLIENT_ID: string | null;
    readonly VITE_ATHENA_API_HOST: string | null;
    readonly VITE_ATHENA_SCOPES: string | null;
    readonly VITE_REDIRECT_URI: string | null;
}
