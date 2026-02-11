/**
 * Export floor plan SVG as image
 */

export async function exportFloorPlanAsSVG(svgElement: SVGSVGElement): Promise<Blob> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgElement)
  return new Blob([svgString], { type: 'image/svg+xml' })
}

export async function exportFloorPlanAsPNG(svgElement: SVGSVGElement): Promise<Blob> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgElement)

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // Scale up for better quality
      const scale = 2
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create PNG blob'))
      }, 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG as image'))
    }

    img.src = url
  })
}

export async function downloadFloorPlan(
  svgElement: SVGSVGElement,
  format: 'svg' | 'png' = 'png',
  filename = 'floor-plan'
) {
  const blob = format === 'svg'
    ? await exportFloorPlanAsSVG(svgElement)
    : await exportFloorPlanAsPNG(svgElement)

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
