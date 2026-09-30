import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// NON-SAVING ENTITY BRANDING PROPOSAL PREVIEW server (T4). Same mock aliases
// as vite.harness.config.ts — no real network call or database write is
// possible (the page uses no backend at all). Own entry
// (entity-branding-preview.html), own port 5197, bound to 127.0.0.1.
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
      input: path.resolve(rootDir, 'entity-branding-preview.html'),
    },
  },
  server: {
    // Fixed, distinct port so it's never confused with the real `npm run
    // dev` (default 5173) — deliberately does not read/override any of
    // that server's own settings.
    host: '127.0.0.1',
    port: 5197,
    strictPort: true,
    open: '/entity-branding-preview.html',
  },
})
