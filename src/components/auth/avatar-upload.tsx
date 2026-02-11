'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, Trash2 } from 'lucide-react'

interface AvatarUploadProps {
  avatarUrl?: string | null
  fullName: string
  onUploadComplete?: (url: string | null) => void
}

export function AvatarUpload({ avatarUrl, fullName, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('settings.profilePicture')

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError(t('invalidFileType'))
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('fileTooLarge'))
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setCurrentAvatar(data.avatar_url)
      onUploadComplete?.(data.avatar_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!currentAvatar) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      setCurrentAvatar(null)
      onUploadComplete?.(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete avatar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
          <AvatarImage src={currentAvatar || undefined} alt={fullName} />
          <AvatarFallback className="bg-primary text-white text-2xl font-semibold">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || deleting}
        />

        <Button
          size="icon"
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
        >
          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {uploading ? t('uploading') : t('upload')}
        </Button>

        {currentAvatar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={uploading || deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {deleting ? t('uploading') : t('remove')}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        {t('maxSize')}
      </p>
    </div>
  )
}
