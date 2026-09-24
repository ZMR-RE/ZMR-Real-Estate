import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ISOLATED dev-only config for the mock-data browser-test harness
// (src/devHarness/). Completely separate from vite.config.ts, which
// `npm run dev`/`npm run build` still use unchanged and unmodified —
// this file exists so a harness session can NEVER accidentally load
// through the real, live-backed dev configuration, and vice versa.
//
// The alias below is what makes every component under test run against
// in-memory mock data: any import of shared/supabaseClient or
// shared/auth/AuthContext, from ANY file the harness pulls in
// transitively (query files, hooks, deeply-nested components), resolves
// to the mock modules in src/devHarness/ instead of the real ones. No
// real Supabase URL or key is ever read by this bundle — .env's real
// values are irrelevant to it.
const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Every distinct relative specifier this repository actually uses to
      // import these two modules, confirmed exhaustively via:
      //   grep -rhoE "from '[^']*supabaseClient'" src/ | sort -u
      //   grep -rhoE "from '[^']*AuthContext'" src/ | sort -u
      // Files sit at different depths (src/modules/*/ is two levels under
      // src/, src/shared/pickLists/ is one, src/App.tsx is zero), so each
      // depth produces a different relative string to the same target —
      // Vite/Rollup alias matching is on the raw import text, not the
      // resolved path, so every variant needs its own exact entry. A
      // regex keyed on "shared/..." was tried first and missed
      // '../auth/AuthContext' (used from inside src/shared/pickLists/
      // itself, where "shared" isn't part of the relative text at all) —
      // crashed the harness with "useAuth must be used within an
      // AuthProvider" the moment a component using PickListSelect
      // rendered. This exhaustive list is the fix.
      { find: '../../shared/supabaseClient', replacement: path.resolve(rootDir, 'src/devHarness/mockSupabaseClient.ts') },
      { find: '../supabaseClient', replacement: path.resolve(rootDir, 'src/devHarness/mockSupabaseClient.ts') },
      { find: '../../shared/auth/AuthContext', replacement: path.resolve(rootDir, 'src/devHarness/mockAuthContext.tsx') },
      { find: '../auth/AuthContext', replacement: path.resolve(rootDir, 'src/devHarness/mockAuthContext.tsx') },
      { find: './auth/AuthContext', replacement: path.resolve(rootDir, 'src/devHarness/mockAuthContext.tsx') },
      { find: './shared/auth/AuthContext', replacement: path.resolve(rootDir, 'src/devHarness/mockAuthContext.tsx') },
    ],
  },
  root: rootDir,
  build: {
    rollupOptions: {
      input: path.resolve(rootDir, 'harness.html'),
    },
  },
  server: {
    // Fixed, distinct port so it's never confused with the real `npm run
    // dev` (default 5173) — deliberately does not read/override any of
    // that server's own settings.
    port: 5180,
    strictPort: true,
    open: '/harness.html',
  },
})
