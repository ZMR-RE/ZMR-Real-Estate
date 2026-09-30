import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ENTITY BRANDING & DOCUMENTS REVIEW server (T4) — the real Settings screen
// with a SIMULATED backend: shared/supabaseClient and shared/auth/AuthContext
// are replaced by src/modules/entityBranding/review/ for this whole bundle (no
// URL, no key, no network). Own entry (entity-branding-review.html), own port
// 5198, bound to 127.0.0.1.
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
      { find: '../../shared/supabaseClient', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewSupabaseClient.ts') },
      { find: '../supabaseClient', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewSupabaseClient.ts') },
      { find: '../../shared/auth/AuthContext', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewAuthContext.tsx') },
      { find: '../auth/AuthContext', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewAuthContext.tsx') },
      { find: './auth/AuthContext', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewAuthContext.tsx') },
      { find: './shared/auth/AuthContext', replacement: path.resolve(rootDir, 'src/modules/entityBranding/review/reviewAuthContext.tsx') },
    ],
  },
  root: rootDir,
  build: {
    rollupOptions: {
      input: path.resolve(rootDir, 'entity-branding-review.html'),
    },
  },
  server: {
    // Fixed, distinct port so it's never confused with the real `npm run
    // dev` (default 5173) — deliberately does not read/override any of
    // that server's own settings.
    host: '127.0.0.1',
    port: 5198,
    strictPort: true,
    open: '/entity-branding-review.html',
  },
})
