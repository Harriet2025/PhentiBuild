import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
// The original PhentiBuild design system, copied unchanged from
// frontend/css (tokens, reset, typography, components, modules, utilities).
import './styles/main.css'
// React-app layout refinements (layout only — colours/fonts untouched).
import './styles/react/auth-fullscreen.css'
// Phone / tablet / iPad refinements (layout only) — must stay last.
import './styles/react/responsive.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { ConfirmProvider } from './components/ConfirmDialog'
import { ToastProvider } from './components/Toast'

/**
 * Keep old bookmarks working. The PHP app used "#projects/PHB-0001";
 * React Router's HashRouter uses "#/projects/PHB-0001". Insert the
 * missing slash once, before the router reads the URL.
 */
const { hash } = window.location
if (hash && hash !== '#' && !hash.startsWith('#/')) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/${hash.slice(1)}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
