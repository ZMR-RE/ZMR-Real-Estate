import { createRoot } from 'react-dom/client'
import { MemoryRouter,Route,Routes } from 'react-router-dom'
import { AppShell } from '../../shared/AppShell'
import { App } from './StatementHarness'
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/properties/fictional']}><Routes><Route element={<AppShell/>}><Route path="*" element={<App/>}/></Route></Routes></MemoryRouter>)
