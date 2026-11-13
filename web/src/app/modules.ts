import type { IconName } from '../components/Icon'

/**
 * Single source of truth for the sidebar and module routes — the same
 * list (ids, labels, groups, descriptions) as $modules in
 * frontend/pages/app.php. The id doubles as the URL path, so the old
 * bookmarks keep working: #projects/PHB-0001 → /projects/PHB-0001.
 */
export type ModuleDef = {
  id: string
  label: string
  group: 'Overview' | 'Data Capture' | 'Tools' | 'Documents' | 'Account'
  icon: IconName
  desc: string
}

export const MODULES: ModuleDef[] = [
  { group: 'Overview', id: 'dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Project overview, key metrics and recent activity will appear here.' },
  { group: 'Overview', id: 'projects', label: 'Projects', icon: 'projects', desc: 'Create, browse and manage all construction projects from one place.' },
  { group: 'Data Capture', id: 'scanner', label: 'Scanner', icon: 'scanner', desc: 'Use your device camera to capture site photos for computer-vision based measurement and material identification.' },
  { group: 'Data Capture', id: 'manual-input', label: 'Manual Input', icon: 'edit', desc: "Enter wall, floor, roof and structural measurements manually when a scan isn't available." },
  { group: 'Tools', id: 'calculators', label: 'Calculators', icon: 'calculator', desc: 'Block, cement, sand, aggregate, concrete, rebar and timber calculators.' },
  { group: 'Tools', id: 'materials', label: 'Materials', icon: 'materials', desc: 'Identify and manage building materials, quantities and unit costs.' },
  { group: 'Tools', id: 'roof-studio', label: 'Roof Studio', icon: 'roof', desc: 'Design roofs in 2D, visualize them in 3D, and generate AI-assisted roof layouts.' },
  { group: 'Documents', id: 'boq', label: 'BOQ', icon: 'boq', desc: 'Bill of Quantities compiled from your calculations and measurements.' },
  { group: 'Documents', id: 'reports', label: 'Reports', icon: 'reports', desc: 'Export professional reports and BOQs to Excel.' },
  { group: 'Documents', id: 'history', label: 'History', icon: 'history', desc: 'Project history, revisions and a full audit trail of changes.' },
]

export const SETTINGS_MODULE: ModuleDef = {
  group: 'Account', id: 'settings', label: 'Settings', icon: 'settings',
  desc: 'Manage your account, company profile, units of measurement and preferences.',
}

export const ALL_MODULES = [...MODULES, SETTINGS_MODULE]

export function findModule(id: string | undefined): ModuleDef | undefined {
  return ALL_MODULES.find((m) => m.id === id)
}
