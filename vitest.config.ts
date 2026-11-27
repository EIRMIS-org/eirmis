import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(import.meta.dirname, './src'),
          },
        },
        test: {
          name: 'frontend',
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
          css: false,
          include: ['src/**/*.test.{ts,tsx}'],
          globals: false,
        },
      },
      {
        test: {
          name: 'supabase-functions',
          environment: 'node',
          include: ['supabase/functions/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**', '**/*_test.ts'],
          globals: false,
        },
      },
    ],
  },
})
