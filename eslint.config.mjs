// bisiyata dishmaya, leharbot ahava biyisral
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const layer = (...groups) => groups.flatMap((g) => [`@/${g}`, `@/${g}/**`]);
const UI_LAYERS = layer('ui', 'features', 'app', 'print');
const ENGINE_LAYERS = layer('layout', 'ai', 'images', 'background');
const IDB_ONLY_IN_STORAGE = { name: 'idb', message: 'Only src/storage may touch IndexedDB.' };

const restrictImports = (paths, patterns) => ({
  'no-restricted-imports': ['error', { paths, patterns }],
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'spikes'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },

  // Only src/storage may use IndexedDB or chrome.storage.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/storage/**'],
    rules: {
      ...restrictImports([IDB_ONLY_IN_STORAGE], []),
      'no-restricted-globals': ['error', { name: 'indexedDB', message: 'Use src/storage.' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='chrome'][property.name='storage']",
          message: 'Use src/storage (SettingsRepository) instead of chrome.storage.',
        },
      ],
    },
  },

  // Layering: domain is pure and depends on nothing but shared.
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: restrictImports(
      [IDB_ONLY_IN_STORAGE, { name: 'react' }, { name: 'react-dom' }],
      [{ group: ['@/storage', '@/storage/**', ...UI_LAYERS, ...ENGINE_LAYERS] }],
    ),
  },
  // Storage knows the domain and shared helpers only.
  {
    files: ['src/storage/**/*.{ts,tsx}'],
    rules: restrictImports(
      [{ name: 'react' }, { name: 'react-dom' }],
      [{ group: [...UI_LAYERS, ...ENGINE_LAYERS] }],
    ),
  },
  // Shared and i18n sit below the domain.
  {
    files: ['src/shared/**/*.{ts,tsx}', 'src/i18n/**/*.{ts,tsx}'],
    rules: restrictImports(
      [IDB_ONLY_IN_STORAGE],
      [{ group: [...layer('domain', 'storage'), ...UI_LAYERS, ...ENGINE_LAYERS] }],
    ),
  },
  // The jobs messaging contract is typed with domain job records (plan section 5.5).
  {
    files: ['src/shared/messaging.ts'],
    rules: restrictImports([IDB_ONLY_IN_STORAGE], [
      { group: [...layer('storage'), ...UI_LAYERS, ...ENGINE_LAYERS] },
    ]),
  },
);
