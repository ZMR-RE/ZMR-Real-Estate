import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ISOLATED-INTEGRATION — dedicated dev server for the separate hosted
// Supabase PRACTICE project. Unlike vite.harness.config.ts (which
// aliases the real supabaseClient/AuthContext away entirely, so it can
// never reach any backend), this config loads the REAL app entry
// (index.html -> src/main.tsx -> App.tsx -> AppShell), the real
// supabaseClient.ts, and real Supabase Auth — just pointed at the
// practice project instead of production, via a completely separate env
// directory. `envDir` below is the only thing that makes this safe: it
// is the ONE and ONLY place Vite looks for env vars in this config, so
// the real repo-root `.env` (production) is never read here, and
// nothing here can fall back to it. supabaseClient.ts's own
// VITE_PRACTICE_TARGET check is the second, independent layer — it
// refuses to start at all if envs/practice/.env is missing or still
// points at the production project ref.
const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(rootDir, 'envs/practice'),
  root: rootDir,
  server: {
    // Fixed, distinct port — never 5173 (real, live-backed dev server)
    // or 5180 (the mock harness). This config never touches either.
    port: 5190,
    strictPort: true,
  },
})
