import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default tseslint.config(
    { ignores: ['dist', 'coverage'] },
    {
        extends: [
            ...tseslint.configs.recommendedTypeChecked,
            {
                languageOptions: {
                    parserOptions: {
                        projectService: true,
                        tsconfigRootDir: import.meta.dirname,
                    },
                },
            },
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
            eslintConfigPrettier,
        ],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'react-x': reactX,
            'react-dom': reactDom,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            ...reactX.configs['recommended-typescript'].rules,
            ...reactDom.configs.recommended.rules,
        },
    },
);
