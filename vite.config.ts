/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages는 https://<계정>.github.io/<저장소>/ 경로에서 열립니다.
// 저장소 이름이 정해지면 VITE_BASE(예: /texam-calendar/)로 지정합니다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
