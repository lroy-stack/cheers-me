'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X, Loader2 } from 'lucide-react'

interface AdImageUploadProps {
  adId: string
  currentImageUrl: string | null
  onImageChange: (url: string | null) => void
}

export default function AdImageUpload({ adId, currentImageUrl, onImageChange }: AdImageUploadProps) {
  const t = useTranslations('ads.form')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`/api/ads/${adId}/image`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        onImageChange(data.image_url)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const res = await fetch(`/api/ads/${adId}/image`, { method: 'DELETE' })
      if (res.ok) {
        onImageChange(null)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {currentImageUrl ? (
        <div className="relative group">
          <img src={currentImageUrl} alt="Ad" className="w-full h-40 rounded-lg object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{t('uploadImage')}</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  )
}
