/**
 * Server-Side Artifact Parser
 * Detects artifact blocks in assistant text and extracts metadata.
 * Supports optional title: ```artifact:type:Title Here
 */

import type { ArtifactType } from './types'

export interface ParsedArtifact {
  type: ArtifactType
  title: string
  content: string
  identifier: string
}

// Matches ```artifact:type or ```artifact:type:Title
const ARTIFACT_REGEX = /```artifact:([\w-]+)(?::([^\n]*))?\r?\n([\s\S]*?)```/g

function autoTitle(type: string, content: string): string {
  switch (type) {
    case 'html': {
      const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i)
      if (h1Match) return h1Match[1].replace(/<[^>]*>/g, '').trim()
      const titleMatch = content.match(/<title>(.*?)<\/title>/i)
      if (titleMatch) return titleMatch[1].trim()
      return 'HTML Document'
    }
    case 'chart': {
      try {
        const json = JSON.parse(content)
        if (json.title) return json.title
      } catch { /* ignore */ }
      return 'Chart'
    }
    case 'table': {
      try {
        const json = JSON.parse(content)
        if (json.title) return json.title
        if (json.columns) return `Table (${json.columns.length} columns)`
      } catch { /* ignore */ }
      return 'Data Table'
    }
    case 'mermaid':
      return 'Diagram'
    case 'code':
      return 'Code Snippet'
    case 'calendar':
      return 'Schedule'
    case 'form':
      return 'Form'
    default:
      return 'Artifact'
  }
}

export function parseArtifacts(text: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = []
  const regex = new RegExp(ARTIFACT_REGEX.source, ARTIFACT_REGEX.flags)
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const type = match[1] as ArtifactType
    const explicitTitle = match[2]?.trim()
    const content = match[3].trim()

    artifacts.push({
      type,
      title: explicitTitle || autoTitle(type, content),
      content,
      identifier: crypto.randomUUID(),
    })
  }

  return artifacts
}
