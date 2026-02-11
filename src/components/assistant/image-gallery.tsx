'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageLightbox } from './image-lightbox'
import {
  Search,
  Download,
  Trash2,
  MessageSquare,
  ImageOff,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GalleryImage {
  id: string
  prompt: string
  purpose: string | null
  public_url: string | null
  storage_path: string
  conversation_id: string | null
  created_at: string
}

interface ImageGalleryProps {
  onBack: () => void
  onOpenConversation?: (conversationId: string) => void
}

const PURPOSE_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'social_post', label: 'Social' },
  { value: 'menu_item', label: 'Menu' },
  { value: 'event_promo', label: 'Events' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'general', label: 'General' },
] as const

export function ImageGallery({ onBack, onOpenConversation }: ImageGalleryProps) {
  const t = useTranslations('common.assistant')
  const [images, setImages] = useState<GalleryImage[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [purpose, setPurpose] = useState('all')
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offsetRef = useRef(0)

  const fetchImages = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true)
      offsetRef.current = 0
    } else {
      setLoadingMore(true)
    }

    const params = new URLSearchParams({ limit: '50', offset: String(offsetRef.current) })
    if (purpose !== 'all') params.set('purpose', purpose)
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())

    try {
      const res = await fetch(`/api/ai/images?${params}`)
      if (!res.ok) return
      const data = await res.json()

      if (reset) {
        setImages(data.images)
      } else {
        setImages(prev => [...prev, ...data.images])
      }
      setTotal(data.total)
      offsetRef.current += data.images.length
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [purpose, debouncedSearch])

  useEffect(() => {
    fetchImages(true)
  }, [fetchImages])

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 400)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch('/api/ai/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setImages(prev => prev.filter(img => img.id !== id))
        setTotal(prev => prev - 1)
        if (lightboxImage?.id === id) setLightboxImage(null)
      }
    } catch {
      // Silent
    } finally {
      setDeletingId(null)
    }
  }, [lightboxImage])

  const handleDownload = useCallback(async (image: GalleryImage) => {
    if (!image.public_url) return
    try {
      const response = await fetch(image.public_url)
      const blob = await response.blob()
      const ext = blob.type.split('/')[1] || 'png'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cheers-${image.purpose || 'image'}-${new Date(image.created_at).getTime()}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      if (image.public_url) window.open(image.public_url, '_blank')
    }
  }, [])

  const hasMore = images.length < total

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold flex-1">{t('gallery') || 'Gallery'}</h2>
        {!loading && <span className="text-xs text-muted-foreground">{total} {total === 1 ? 'image' : 'images'}</span>}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('searchImages') || 'Search by prompt...'}
            className="h-8 text-xs pl-8"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {PURPOSE_CHIPS.map(chip => (
            <button
              key={chip.value}
              onClick={() => setPurpose(chip.value)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border transition-colors',
                purpose === chip.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image grid — main content area */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ImageOff className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? t('noResults') || 'No images found' : t('noImages') || 'No images generated yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map(image => (
                  <div
                    key={image.id}
                    className="group relative rounded-xl overflow-hidden border bg-muted/30 aspect-square cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => setLightboxImage(image)}
                  >
                    {image.public_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image.public_url}
                        alt={image.prompt}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                      <p className="text-[11px] text-white/90 line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-md bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                          onClick={(e) => { e.stopPropagation(); handleDownload(image) }}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5 text-white" />
                        </button>
                        {image.conversation_id && onOpenConversation && (
                          <button
                            className="p-1.5 rounded-md bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); onOpenConversation(image.conversation_id!) }}
                            title="Open chat"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-white" />
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-md bg-white/20 hover:bg-red-500/60 transition-colors backdrop-blur-sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(image.id) }}
                          title="Delete"
                          disabled={deletingId === image.id}
                        >
                          {deletingId === image.id
                            ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5 text-white" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Purpose badge */}
                    {image.purpose && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-[10px] text-white/90 backdrop-blur-sm">
                        {image.purpose.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fetchImages(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                    {loadingMore ? 'Loading...' : `Load more (${images.length} of ${total})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Lightbox */}
      {lightboxImage && lightboxImage.public_url && (
        <ImageLightbox
          src={lightboxImage.public_url}
          alt={lightboxImage.prompt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  )
}
