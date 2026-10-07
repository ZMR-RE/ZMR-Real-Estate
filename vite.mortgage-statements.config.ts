import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({
  plugins:[react()],
  resolve:{alias:[{find:/.*\/auth\/AuthContext$/,replacement:path.resolve(import.meta.dirname,'src/devHarness/mortgageStatements/auth.ts')}]},
  envDir:path.resolve(import.meta.dirname,'src/devHarness/mortgageStatements'),
  server:{host:'127.0.0.1',port:5305,strictPort:true},
})
