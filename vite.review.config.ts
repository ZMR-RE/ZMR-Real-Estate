import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// T2 review server — the real app (index.html -> AppShell) pointed at the
// separate hosted PRACTICE project, for owner visual review and terminal
// acceptance of a branch checkout. Same safety model as
// vite.practice.config.ts: envDir is the ONLY place env vars are read, so
// the repo-root production .env can never be picked up, and
// supabaseClient.ts refuses to start if that directory is missing or points
// at the production project.
//
// Differences from vite.practice.config.ts (which T1's server owns on
// 5190): port 5191, bound to 127.0.0.1 (Chrome keeps page zoom per host,
// so this origin isn't affected by a zoom level set on "localhost"), and
// ZMR_PRACTICE_ENV_DIR lets a secondary checkout (worktree) read the one
// existing, git-ignored envs/practice/.env in place instead of copying
// credentials. No credential is stored in this file.
//
//   ZMR_PRACTICE_ENV_DIR=/path/to/main/checkout/envs/practice \
//     npx vite --config vite.review.config.ts
const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  envDir: process.env.ZMR_PRACTICE_ENV_DIR ?? path.resolve(rootDir, 'envs/practice'),
  root: rootDir,
  server: {
    host: '127.0.0.1',
    port: 5191,
    strictPort: true,
  },
})
