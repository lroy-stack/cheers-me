'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Point {
  x: number
  y: number
}

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSave,
  width = 400,
  height = 200,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [isEmpty, setIsEmpty] = useState(true)

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if ('touches' in e) {
        const touch = e.touches[0]
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        }
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const redrawCanvas = useCallback(
    (strokesToDraw: Point[][]) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (const stroke of strokesToDraw) {
        if (stroke.length < 2) continue

        ctx.beginPath()
        ctx.moveTo(stroke[0].x, stroke[0].y)

        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y)
        }

        ctx.stroke()
      }
    },
    []
  )

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const point = getCanvasPoint(e)
      setIsDrawing(true)
      setCurrentStroke([point])

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
    },
    [getCanvasPoint]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return
      e.preventDefault()

      const point = getCanvasPoint(e)
      setCurrentStroke((prev) => [...prev, point])

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    },
    [isDrawing, getCanvasPoint]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, currentStroke])
      setIsEmpty(false)
    }

    setCurrentStroke([])
  }, [isDrawing, currentStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchPrevent = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchmove', handleTouchPrevent, { passive: false })
    return () => {
      document.removeEventListener('touchmove', handleTouchPrevent)
    }
  }, [])

  const handleClear = useCallback(() => {
    setStrokes([])
    setCurrentStroke([])
    setIsEmpty(true)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1)
      redrawCanvas(next)
      if (next.length === 0) {
        setIsEmpty(true)
      }
      return next
    })
  }, [redrawCanvas])

  const handleSign = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }, [onSave])

  return (
    <div className={className}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full rounded-lg border border-border bg-muted dark:border-border dark:bg-muted cursor-crosshair touch-none"
          style={{ maxWidth: width }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">Draw your signature above</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={strokes.length === 0}
        >
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSign}
          disabled={isEmpty}
        >
          Sign
        </Button>
      </div>
    </div>
  )
}
