import path from 'node:path'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
export default defineConfig({plugins:[react()],resolve:{alias:[
 {find:/.*\/auth\/AuthContext$/,replacement:path.resolve(import.meta.dirname,'src/devHarness/mortgageStatements/auth.ts')},
 {find:/.*\/supabaseClient$/,replacement:path.resolve(import.meta.dirname,'src/devHarness/documentIntake/mockClient.ts')},
]},server:{host:'127.0.0.1',port:5314,strictPort:true},build:{outDir:path.resolve(import.meta.dirname,'../../document-intake-local-build'),rollupOptions:{input:path.resolve(import.meta.dirname,'document-intake-local.html')}}})
