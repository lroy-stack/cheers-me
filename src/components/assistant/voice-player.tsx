'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'

interface VoicePlayerProps {
  text: string
  language?: string
  disabled?: boolean
}

type PlayState = 'idle' | 'loading' | 'playing' | 'paused'

export function VoicePlayer({ text, language = 'en', disabled }: VoicePlayerProps) {
  const [state, setState] = useState<PlayState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  const handlePlay = useCallback(async () => {
    if (state === 'playing') {
      audioRef.current?.pause()
      setState('paused')
      return
    }

    if (state === 'paused' && audioRef.current) {
      audioRef.current.play()
      setState('playing')
      return
    }

    // New playback
    cleanup()
    setState('loading')

    try {
      const res = await fetch('/api/ai/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      })

      if (!res.ok) {
        throw new Error(`Speech API error: ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setState('idle')
        cleanup()
      }

      audio.onerror = () => {
        setState('idle')
        cleanup()
      }

      await audio.play()
      setState('playing')
    } catch (error) {
      console.error('Voice playback error:', error)
      setState('idle')
      cleanup()
    }
  }, [state, text, language, cleanup])

  const handleStop = useCallback(() => {
    cleanup()
    setState('idle')
  }, [cleanup])

  if (!text.trim()) return null

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handlePlay}
        disabled={disabled}
        title={state === 'playing' ? 'Pause' : 'Play voice'}
      >
        {state === 'loading' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : state === 'playing' ? (
          <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
      {(state === 'playing' || state === 'paused') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleStop}
          title="Stop"
        >
          <VolumeX className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
