import js from '@eslint/js';
import globals from 'globals';

export default [
  // Global ignores - must be first
  {
    ignores: [
      'node_modules/**',
      'src/assets/**',
      '*.config.js',
      '.vscode/**',
      'docs/**'
    ]
  },
  // Recommended rules
  js.configs.recommended,
  // Main configuration
  {
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly'
      }
    },
    rules: {
      // Stylistic consistency
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],

      // Best practices
      'no-console': 'off', // Allow console logs (prefixed with [LinguaFlix])
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',

      // ES6+ features
      'no-duplicate-imports': 'error',
      'object-shorthand': 'error',
      'template-curly-spacing': 'error',

      // Code quality
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-with': 'error',
      'no-alert': 'warn',

      // Chrome Extension specific
      'no-undef': 'error' // Catch undefined variables (chrome is defined in globals)
    }
  },
  // Source files specific rules
  {
    files: ['src/**/*.js'],
    rules: {
      // Additional rules for source files can be added here
    }
  }
];
