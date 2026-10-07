import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({plugins:[react()],envDir:path.resolve(import.meta.dirname,'src/devHarness/documentLibrary'),resolve:{alias:[{find:/.*\/pickLists\/PickListSelect$/,replacement:path.resolve(import.meta.dirname,'src/devHarness/documentLibrary/PickListSelect.tsx')}]},server:{host:'127.0.0.1',port:5307,strictPort:true}})
