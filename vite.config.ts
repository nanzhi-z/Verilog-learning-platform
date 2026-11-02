/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        // 函数形式分包：把编辑器与框架拆成独立长效缓存块
        manualChunks(id) {
          if (id.indexOf('node_modules') === -1) return undefined;
          if (
            id.indexOf('@codemirror') !== -1 ||
            id.indexOf('@lezer') !== -1 ||
            id.indexOf('@uiw') !== -1
          ) {
            return 'codemirror';
          }
          if (
            id.indexOf('react-router') !== -1 ||
            id.indexOf('react-dom') !== -1 ||
            id.indexOf('node_modules/react/') !== -1 ||
            id.indexOf('node_modules/scheduler/') !== -1
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
