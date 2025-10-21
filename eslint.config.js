import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        MediaRecorder: 'readonly',
        MediaStream: 'readonly',
        Blob: 'readonly',
        Event: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLTextAreaElement: 'readonly',
        AudioContext: 'readonly',
        OfflineAudioContext: 'readonly',
        AudioBuffer: 'readonly',
        AnalyserNode: 'readonly',
        PermissionName: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        DOMException: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
        Date: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLImageElement: 'readonly',
        Node: 'readonly',
        MutationObserver: 'readonly',
        KeyboardEvent: 'readonly',
        MutationRecord: 'readonly',
        Element: 'readonly',
        // Additional Chrome extension and web platform globals
        HTMLDivElement: 'readonly',
        DragEvent: 'readonly',
        File: 'readonly',
        TransformStream: 'readonly',
        Response: 'readonly',
        MessageEvent: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        RequestInit: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        FormData: 'readonly',
        Intl: 'readonly',
        performance: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        ClipboardItem: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLTableElement: 'readonly',
        XPathResult: 'readonly',
        NodeListOf: 'readonly',
        FileList: 'readonly',
        DataTransfer: 'readonly',
        TextEncoder: 'readonly',
        AbortController: 'readonly',
        localStorage: 'readonly',
        MouseEvent: 'readonly',
        Image: 'readonly',
        HTMLAudioElement: 'readonly',
        Worker: 'readonly',
        HTMLTableRowElement: 'readonly',
        CustomEvent: 'readonly',
        EventTarget: 'readonly',
        ProgressEvent: 'readonly',
        NodeJS: 'readonly',
        process: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        Audio: 'readonly',
        HTMLFormElement: 'readonly',
        PointerEvent: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react-hooks/exhaustive-deps': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Web Worker specific configuration
    files: ['src/workers/**/*.ts', 'src/**/*.worker.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        self: 'readonly',
        postMessage: 'readonly',
        onmessage: 'readonly',
        MessageEvent: 'readonly',
        AudioContext: 'readonly',
        AnalyserNode: 'readonly',
        Float32Array: 'readonly',
        Uint8Array: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off' // Web Workers have different global context
    },
  },
  {
    files: ['tests/**/*.{ts,js}', '*.config.{ts,js}', 'run-*.js', 'playwright.config.ts', '*.cjs'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        Event: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off'
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'venv-whisper/**',
      'dspy-env/**',
      'validate-*.js',
      'validate-*.cjs',
      '**/*.py',
      '*.md',
      'README.md',
      'CLAUDE.md',
      'test-results/**'
    ]
  }
];
