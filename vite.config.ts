/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages는 https://<계정>.github.io/<저장소>/ 경로에서 열립니다.
// 화면 이동은 해시 주소(#/...)라서 파일 경로를 상대 경로('./')로 두면 저장소 이름과 상관없이 동작합니다.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
