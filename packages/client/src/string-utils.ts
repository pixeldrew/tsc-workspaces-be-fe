const CHUNK_SIZE = 0x8000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function buf(input: string): Uint8Array;
export function buf(input: Uint8Array): string;
export function buf(input: string | Uint8Array) {
    if (typeof input === 'string') {
        return encoder.encode(input);
    }

    return decoder.decode(input);
}

function encodeBase64Url(input: ArrayBuffer | Uint8Array): string {
    if (input instanceof ArrayBuffer) {
        input = new Uint8Array(input);
    }

    const arr = [];
    for (let i = 0; i < input.byteLength; i += CHUNK_SIZE) {
        arr.push(
          // @ts-expect-error "already an ArrayBuffer"
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
            String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)),
        );
    }
    return btoa(arr.join(''))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
function decodeBase64Url(input: string) {
    try {
        const binary = atob(
            input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''),
        );
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } catch {
        throw new Error('The input to be decoded is not correctly encoded.');
    }
}

export function b64u(input: string): Uint8Array;
export function b64u(input: Uint8Array | ArrayBuffer): string;
export function b64u(
    input: string | Uint8Array | ArrayBuffer,
): string | Uint8Array {
    if (typeof input === 'string') {
        return decodeBase64Url(input);
    }

    return encodeBase64Url(input);
}
