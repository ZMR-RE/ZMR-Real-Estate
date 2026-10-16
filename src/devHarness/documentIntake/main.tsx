import {createRoot} from 'react-dom/client'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {AppShell} from '../../shared/AppShell'
import {Harness} from './Harness'
import '../../index.css'
createRoot(document.getElementById('root')!).render(<MemoryRouter><Routes><Route element={<AppShell/>}><Route path="*" element={<Harness/>}/></Route></Routes></MemoryRouter>)
