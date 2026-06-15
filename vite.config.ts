import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA
  ?? process.env.GITHUB_SHA
  ?? process.env.VITE_BUILD_SHA
  ?? 'local'

const buildTime = new Date().toISOString()

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha.slice(0, 7)),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
})
