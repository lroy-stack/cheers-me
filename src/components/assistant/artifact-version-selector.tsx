'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History } from 'lucide-react'

interface ArtifactVersion {
  id: string
  version: number
  title: string
  type: string
  created_at: string
}

interface ArtifactVersionSelectorProps {
  artifactId: string
  onSelectVersion: (versionId: string) => void
}

export function ArtifactVersionSelector({ artifactId, onSelectVersion }: ArtifactVersionSelectorProps) {
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!artifactId) return
    setLoading(true)
    fetch(`/api/ai/artifacts/${artifactId}/versions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [artifactId])

  if (versions.length <= 1) return null

  const current = versions.find(v => v.id === artifactId) || versions[versions.length - 1]

  return (
    <div className="flex items-center gap-1.5">
      <History className="h-3 w-3 text-muted-foreground shrink-0" />
      <Select
        value={current?.id || artifactId}
        onValueChange={onSelectVersion}
        disabled={loading}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder={`v${current?.version || 1}`} />
        </SelectTrigger>
        <SelectContent>
          {versions.map(v => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              v{v.version} — {new Date(v.created_at).toLocaleDateString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
