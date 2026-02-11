import type { Artifact } from '@/lib/ai/types'

const EXT_MAP: Record<string, string> = {
  html: 'html',
  chart: 'json',
  table: 'json',
  code: 'txt',
  mermaid: 'mmd',
  calendar: 'json',
  pdf: 'pdf',
  form: 'json',
}

const MIME_MAP: Record<string, string> = {
  html: 'text/html',
  chart: 'application/json',
  table: 'application/json',
  code: 'text/plain',
  mermaid: 'text/plain',
  calendar: 'application/json',
  pdf: 'application/pdf',
  form: 'application/json',
}

/**
 * Detect if an HTML artifact is primarily an image wrapper.
 * Returns the image src if found, null otherwise.
 */
function extractImageSrc(content: string): string | null {
  // Match <img> with src containing base64 data or https URL
  const imgMatch = content.match(/<img\s[^>]*src=["']([^"']+)["']/i)
  if (!imgMatch) return null

  const src = imgMatch[1]
  // Only consider it an image artifact if the src is a data URI or a Supabase storage URL
  if (src.startsWith('data:image/') || src.includes('/storage/v1/object/')) {
    return src
  }
  return null
}

/**
 * Download an image from a data URI or URL as a file.
 */
async function downloadImage(src: string, filename: string): Promise<void> {
  if (src.startsWith('data:')) {
    // Data URI — extract mime and decode
    const mimeMatch = src.match(/^data:(image\/\w+);base64,/)
    const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png'
    const a = document.createElement('a')
    a.href = src
    a.download = `${filename}.${ext}`
    a.click()
  } else {
    // Remote URL — fetch and save as blob
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const ext = blob.type.split('/')[1] || 'png'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank')
    }
  }
}

export function downloadArtifact(artifact: Artifact): void {
  const title = artifact.title || 'artifact'

  // Smart detection: if HTML artifact contains an image, download the image directly
  if (artifact.type === 'html') {
    const imageSrc = extractImageSrc(artifact.content)
    if (imageSrc) {
      downloadImage(imageSrc, title)
      return
    }
  }

  const ext = EXT_MAP[artifact.type] || 'txt'
  const mime = MIME_MAP[artifact.type] || 'text/plain'
  const blob = new Blob([artifact.content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Check if an HTML artifact is an image wrapper.
 */
export function isImageArtifact(artifact: Artifact): boolean {
  if (artifact.type !== 'html') return false
  return extractImageSrc(artifact.content) !== null
}

/**
 * Get the image source from an image artifact.
 */
export function getImageSrc(artifact: Artifact): string | null {
  if (artifact.type !== 'html') return null
  return extractImageSrc(artifact.content)
}
