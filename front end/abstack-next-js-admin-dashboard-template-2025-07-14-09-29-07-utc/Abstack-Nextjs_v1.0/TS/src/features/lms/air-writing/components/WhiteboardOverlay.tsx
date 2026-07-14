'use client'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useHandTracking } from '../hooks/useHandTracking'
import { useWhiteboardChannel } from '../hooks/useWhiteboardChannel'
import type { Point } from '../utils/smoothPoint'
import type { WhiteboardMessage, WhiteboardStrokePhase } from '../types'

const STROKE_COLOR = '#ef4444'
const STROKE_WIDTH = 3

interface WhiteboardOverlayProps {
  mode: 'draw' | 'view'
  /** Draw mode only: whether hand-tracking should currently be running. */
  active?: boolean
  /** Draw mode only: bump this to clear the board (locally + broadcast to everyone). */
  clearRequestId?: number
  onStatusChange?: (status: { isModelLoading: boolean; error: string | null; isPenLifted: boolean }) => void
}

export interface WhiteboardOverlayHandle {
  /** Draw mode only. Returns null if nothing was ever actually drawn (no stroke reached the
   * 2-point minimum the renderer needs to draw a line) — callers should skip the upload/attach
   * flow entirely in that case rather than saving a blank canvas. */
  captureSnapshot: () => Promise<Blob | null>
}

/**
 * Absolutely-positioned, pointer-events-none canvas layered over the LiveKit video area.
 * Must be rendered as a descendant of <LiveKitRoom> (useRoomContext, via useWhiteboardChannel,
 * requires it). Draw mode runs camera-based hand tracking and renders + broadcasts strokes;
 * view mode only subscribes to and renders incoming strokes — no ML code ever runs there.
 */
export const WhiteboardOverlay = forwardRef<WhiteboardOverlayHandle, WhiteboardOverlayProps>(
  function WhiteboardOverlay({ mode, active = false, clearRequestId = 0, onStatusChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const strokesRef = useRef<Point[][]>([])
    const currentStrokeIdRef = useRef<string | null>(null)
    const isFirstClearRef = useRef(true)
    const [isPenLifted, setIsPenLifted] = useState(false)

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const stroke of strokesRef.current) {
        if (stroke.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height)
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x * canvas.width, stroke[i].y * canvas.height)
        }
        ctx.stroke()
      }
    }, [])

    const appendPoint = useCallback(
      (point: Point, phase: WhiteboardStrokePhase) => {
        if (phase === 'start') {
          strokesRef.current.push([point])
        } else {
          const last = strokesRef.current[strokesRef.current.length - 1]
          if (last) last.push(point)
          else strokesRef.current.push([point])
        }
        redraw()
      },
      [redraw],
    )

    const handleIncomingMessage = useCallback(
      (message: WhiteboardMessage) => {
        if (message.type === 'clear') {
          strokesRef.current = []
          redraw()
          return
        }
        appendPoint({ x: message.x, y: message.y }, message.phase)
      },
      [appendPoint, redraw],
    )

    const { broadcastPoint, broadcastClear } = useWhiteboardChannel({
      onMessage: handleIncomingMessage,
    })

    const handleHandTrackingPoint = useCallback(
      (point: Point, phase: WhiteboardStrokePhase) => {
        if (phase === 'start') {
          currentStrokeIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        const strokeId = currentStrokeIdRef.current ?? 'stroke'
        appendPoint(point, phase) // optimistic local render — never waits on the network round-trip
        broadcastPoint(point.x, point.y, strokeId, phase)
      },
      [appendPoint, broadcastPoint],
    )

    const handTracking = useHandTracking({
      onPoint: handleHandTrackingPoint,
      onPinchChange: setIsPenLifted,
    })
    const { start: startHandTracking, stop: stopHandTracking } = handTracking

    useEffect(() => {
      if (mode !== 'draw') return
      if (active) {
        void startHandTracking()
      } else {
        stopHandTracking()
        setIsPenLifted(false)
      }
    }, [mode, active, startHandTracking, stopHandTracking])

    useEffect(() => {
      onStatusChange?.({
        isModelLoading: handTracking.isModelLoading,
        error: handTracking.error,
        isPenLifted,
      })
    }, [handTracking.isModelLoading, handTracking.error, isPenLifted, onStatusChange])

    useEffect(() => {
      if (isFirstClearRef.current) {
        isFirstClearRef.current = false
        return
      }
      if (mode !== 'draw') return
      strokesRef.current = []
      redraw()
      broadcastClear()
    }, [clearRequestId, mode, redraw, broadcastClear])

    useEffect(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const resize = () => {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        redraw()
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(container)
      return () => observer.disconnect()
    }, [redraw])

    useImperativeHandle(
      ref,
      () => ({
        captureSnapshot: () => {
          const hasDrawnContent = strokesRef.current.some((stroke) => stroke.length >= 2)
          const canvas = canvasRef.current
          if (mode !== 'draw' || !hasDrawnContent || !canvas) {
            return Promise.resolve(null)
          }
          return new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png')
          })
        },
      }),
      [mode],
    )

    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    )
  },
)
