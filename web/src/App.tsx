import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { BoqPage } from './features/boq/BoqPage'
import { CalculatorsPage } from './features/calculators/CalculatorsPage'
import { HistoryPage } from './features/history/HistoryPage'
import { ManualInputPage } from './features/manual-input/ManualInputPage'
import { MaterialsPage } from './features/materials/MaterialsPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { ScannerPage } from './features/scanner/ScannerPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ProjectDetailPage } from './features/projects/ProjectDetailPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { SiteLayout } from './site/SiteLayout'
import { AboutPage, ContactPage, FaqPage, PricingPage } from './site/pages/CompanyPages'
import { HomePage } from './site/pages/HomePage'
import { LegalPage } from './site/pages/LegalPages'
import { NotFoundPage } from './site/pages/NotFoundPage'
import { FeaturesPage, HowItWorksPage, SolutionsPage } from './site/pages/ProductPages'

// Three.js is large — Roof Studio is downloaded only when it is opened.
const RoofStudioPage = lazy(() => import('./features/roof-studio/RoofStudioPage').then((m) => ({ default: m.RoofStudioPage })))

/** While auth/me.php is answering, show nothing rather than flash the wrong screen. */
function AuthGate({ require }: { require: 'user' | 'guest' }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="auth-page auth-page--fullscreen" aria-busy="true" />
  if (require === 'user' && status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />
  if (require === 'guest' && status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      {/* Public website: anyone can read it, signed in or not. */}
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
        <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Sign-in pages (logged-in users are sent to the app,
          same as login.php / register.php did). */}
      <Route element={<AuthGate require="guest" />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected: the app shell and every module. */}
      <Route element={<AuthGate require="user" />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:ref" element={<ProjectDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/boq" element={<BoqPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />
          <Route path="/calculators/:type" element={<CalculatorsPage />} />
          <Route path="/manual-input" element={<ManualInputPage />} />
          <Route path="/manual-input/:type" element={<ManualInputPage />} />
          <Route path="/roof-studio" element={<Suspense fallback={<div className="projects-loading"><span className="spinner spinner-lg" /><p className="text-secondary">Loading Roof Studio…</p></div>}><RoofStudioPage /></Suspense>} />
          <Route path="/scanner" element={<ScannerPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
