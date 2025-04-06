import {
    createFilter,
    defineConfig,
    transformWithEsbuild,
    loadEnv,
} from 'vite';
import react from '@vitejs/plugin-react-swc';
import mkcert from 'vite-plugin-mkcert';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import license from 'rollup-plugin-license';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

function licensePlugin() {
    return license({
        thirdParty: {
            output: join(__dirname, '../../dist/client', 'dependencies.txt'),
            includePrivate: true,
        },
    });
}

function buildPathPlugin() {
    return {
        name: 'build-path-plugin',
        config(_: unknown, { mode }: { mode: string }) {
            const { BUILD_PATH } = loadEnv(mode, '.', ['BUILD_PATH']);
            return {
                build: {
                    outDir: BUILD_PATH || '../../dist/client',
                },
            };
        },
    };
}

function svgrPlugin() {
    const filter = createFilter('**/*.svg');
    const postfixRE = /[?#].*$/s;
    return {
        name: 'svgr-plugin',
        async transform(code: string, id: string) {
            if (filter(id)) {
                const { transform } = await import('@svgr/core');
                const { default: jsx } = await import('@svgr/plugin-jsx');
                const filePath = id.replace(postfixRE, '');
                const svgCode = readFileSync(filePath, 'utf8');
                const componentCode = await transform(svgCode, undefined, {
                    filePath,
                    caller: {
                        previousExport: code,
                        defaultPlugins: [jsx],
                    },
                });
                const res = await transformWithEsbuild(componentCode, id, {
                    loader: 'jsx',
                });
                return {
                    code: res.code,
                    map: null,
                };
            }
        },
    };
}

// https://vite.dev/config/
export default defineConfig(() => {
    return {
        base: '/',
        build: {
            target: 'ES2022',
        },
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:3000',
                },
            },
        },
        plugins: [
            buildPathPlugin(),
            react(),
            mkcert(),
            licensePlugin(),
            ViteMinifyPlugin(),
            svgrPlugin(),
        ],
    };
});
