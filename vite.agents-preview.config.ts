import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// NON-SAVING AGENTS WORKSPACE PREVIEW server (T4). Same mock aliases as
// vite.harness.config.ts — shared/supabaseClient and shared/auth/AuthContext
// are replaced for this whole bundle, so no real network call or database
// write is possible. Own entry (agents-preview.html), own port (5193), bound
// to 127.0.0.1; never touches 5173, the harness (5180), Practice (5190), T2
// review (5191) or the Financials preview (5192).
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
      input: path.resolve(rootDir, 'agents-preview.html'),
    },
  },
  server: {
    // Fixed, distinct port so it's never confused with the real `npm run
    // dev` (default 5173) — deliberately does not read/override any of
    // that server's own settings.
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
    open: '/agents-preview.html',
  },
})
