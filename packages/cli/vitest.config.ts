import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',                // CLI entry point
        'src/agents/plugin.ts',        // Interface-only file
        'src/download/downloader.ts',  // Re-export only
        'src/resolver/index.ts',       // Thin wrapper with network deps
        'node_modules/**'
      ]
    }
  }
});
