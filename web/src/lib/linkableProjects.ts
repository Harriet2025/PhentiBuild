import { useEffect, useState } from 'react'
import { projectsApi, type Project } from '../api/resources/projects'
import { useAuth } from '../auth/AuthContext'

/**
 * Projects that records can be linked to. Only projects owned by
 * `ownerId` (default: the logged-in person) are offered, because the
 * server refuses to link one person's record to someone else's project.
 * Returns null while loading.
 */
export function useLinkableProjects(ownerId?: number | null): Project[] | null {
  const { user } = useAuth()
  const owner = ownerId ?? user?.id
  const [projects, setProjects] = useState<Project[] | null>(null)
  useEffect(() => {
    let alive = true
    void projectsApi.getAll().then((r) => {
      if (!alive) return
      const all = r.ok ? r.data : []
      // The classic PHP API has no owners: every project is linkable there.
      setProjects(all.filter((p) => p.ownerId === undefined || p.ownerId === owner))
    })
    return () => { alive = false }
  }, [owner])
  return projects
}

export const projectLabel = (p: Pick<Project, 'ref' | 'name'>) => `${p.ref} — ${p.name}`
