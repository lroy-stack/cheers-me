'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FileAttachment } from '@/lib/ai/types'

interface FileUploadZoneProps {
  onUpload: (files: FileAttachment[]) => void
  onClose: () => void
}

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

export function FileUploadZone({ onUpload, onClose }: FileUploadZoneProps) {
  const t = useTranslations('common.assistant')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, MAX_FILES)
    const validFiles = files.filter(f =>
      ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_SIZE
    )

    if (validFiles.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      validFiles.forEach(f => formData.append('files', f))

      const res = await fetch('/api/ai/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onUpload(data.attachments)
      }
    } finally {
      setUploading(false)
    }
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
  }, [processFiles])

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6"
        onClick={onClose}
      >
        <X className="h-3 w-3" />
      </Button>

      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-xs text-muted-foreground mb-1">
        {uploading ? t('uploading') : t('dropFiles')}
      </p>
      <p className="text-xs text-muted-foreground/60">
        {t('fileTypes')}
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}
