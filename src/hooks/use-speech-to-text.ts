'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseSpeechToTextOptions {
  locale?: string
  onError?: (error: string) => void
}

interface UseSpeechToTextReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechToText(options?: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const localeRef = useRef(options?.locale)
  const onErrorRef = useRef(options?.onError)

  // Keep refs updated
  localeRef.current = options?.locale
  onErrorRef.current = options?.onError

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SR)
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    // Stop any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_e) { /* ignore */ }
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = localeRef.current || navigator.language || 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      setTranscript(finalText)
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: Event) => {
      const speechEvent = event as Event & { error?: string }
      const errorCode = speechEvent.error || 'unknown'

      // Return error codes — UI layer translates them via i18n
      let message: string
      switch (errorCode) {
        case 'not-allowed':
          message = 'mic_denied'
          break
        case 'no-speech':
          message = 'no_speech'
          break
        case 'audio-capture':
          message = 'no_mic'
          break
        case 'network':
          message = 'mic_network'
          break
        case 'aborted':
          // User-initiated abort — not an error
          return
        default:
          message = 'mic_error'
      }

      setError(message)
      setIsListening(false)
      onErrorRef.current?.(message)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
    } catch (_e) {
      setError('mic_error')
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_e) { /* ignore */ }
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
