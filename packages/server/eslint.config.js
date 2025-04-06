import tseslint from 'typescript-eslint';
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
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2020,
        },
        plugins: {},
        rules: {},
    },
);
