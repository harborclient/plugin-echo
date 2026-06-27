import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules', '**/dist', 'scripts/**']
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Import hooks from @harborclient/sdk/react instead.'
            },
            {
              name: 'react-dom',
              message: 'Do not import react-dom in plugin renderer code.'
            },
            {
              name: 'react/jsx-runtime',
              message: 'Use jsxImportSource @harborclient/sdk in tsconfig and esbuild.'
            }
          ]
        }
      ]
    }
  }
);
