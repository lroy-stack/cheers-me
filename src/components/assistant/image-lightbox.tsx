'use client'

import { useEffect, useCallback } from 'react'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt = 'Image', onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 3))
    if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.25))
    if (e.key === '0') setScale(1)
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleDownload = useCallback(async () => {
    const filename = alt || 'image'
    if (src.startsWith('data:')) {
      const mimeMatch = src.match(/^data:(image\/\w+);base64,/)
      const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png'
      const a = document.createElement('a')
      a.href = src
      a.download = `${filename}.${ext}`
      a.click()
    } else {
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
        window.open(src, '_blank')
      }
    }
  }, [src, alt])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 h-12 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white/70 text-sm truncate max-w-[60%]">{alt}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setScale(s => Math.max(s - 0.25, 0.25))}
            title="Zoom out (−)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white/50 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setScale(s => Math.min(s + 0.25, 3))}
            title="Zoom in (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleDownload}
            title="Download PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>
    </div>
  )
}
