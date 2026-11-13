import { useEffect } from 'react'
import type { Project } from '../api/resources/projects'
import { setActiveProjectId, useActiveProjectId } from '../lib/activeProject'
import { projectLabel, useLinkableProjects } from '../lib/linkableProjects'
import '../styles/react/project-picker.css'

/** A plain <select> of projects with a "No project" option. */
export function ProjectSelect({ id, value, onChange, projects, className = 'form-control', noneLabel = 'No project' }: {
  id: string
  value: number | null
  onChange: (id: number | null) => void
  projects: Project[] | null
  className?: string
  noneLabel?: string
}) {
  // Archived projects are offered only if something is already linked to one.
  const options = (projects ?? []).filter((p) => p.status !== 'Archived' || p.id === value)
  return (
    <select id={id} className={className} value={value ?? ''} disabled={projects === null}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{projects === null ? 'Loading projects…' : noneLabel}</option>
      {options.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
    </select>
  )
}

/**
 * "Save to project" — sits in the header of Calculators, Manual Input and
 * the Scanner. The choice is remembered (lib/activeProject.ts).
 */
export function ActiveProjectPicker({ label = 'Save to project', noneLabel = 'No project' }: { label?: string; noneLabel?: string } = {}) {
  const activeId = useActiveProjectId()
  const projects = useLinkableProjects()

  // Forget a remembered project that no longer exists / isn't yours.
  useEffect(() => {
    if (projects && activeId && !projects.some((p) => p.id === activeId)) setActiveProjectId(null)
  }, [projects, activeId])

  return (
    <div className="form-group project-picker">
      <label className="form-label" htmlFor="active-project">{label}</label>
      <ProjectSelect id="active-project" value={activeId} onChange={setActiveProjectId} projects={projects} noneLabel={noneLabel} />
    </div>
  )
}
