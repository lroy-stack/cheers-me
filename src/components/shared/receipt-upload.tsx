'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, Image, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ReceiptUploadProps {
  value?: string
  onChange: (url: string) => void
}

export function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const t = useTranslations('sales')
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(!!value)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      // For now, just show the URL input since we don't have Supabase storage yet
      setShowUrlInput(true)
    },
    []
  )

  const handleClick = () => {
    setShowUrlInput(true)
  }

  const handleClear = () => {
    onChange('')
    setShowUrlInput(false)
  }

  // If there is a value, show a preview link
  if (value) {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value)
    const isPdf = /\.pdf$/i.test(value)

    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isImage ? (
              <Image className="h-4 w-4 text-blue-500" />
            ) : isPdf ? (
              <FileText className="h-4 w-4 text-red-500" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-[200px]"
            >
              {value}
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Show URL text input when prompted
  if (showUrlInput) {
    return (
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="https://..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(false)}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
    )
  }

  // Default: drag-drop area
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
        transition-colors
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-border hover:border-border dark:hover:border-slate-600'
        }
      `}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">
        {t('expenses.uploadReceipt')}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {t('expenses.dragDropReceipt')}
      </p>
    </div>
  )
}
