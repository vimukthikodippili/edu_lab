'use client'
import { useCallback, useEffect, useRef } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { ConnectionState, RoomEvent } from 'livekit-client'
import {
  WHITEBOARD_DATA_TOPIC,
  type WhiteboardMessage,
  type WhiteboardPointMessage,
  type WhiteboardStrokePhase,
} from '../types'

const BROADCAST_THROTTLE_MS = 40 // ~25 messages/sec

interface UseWhiteboardChannelOptions {
  onMessage: (message: WhiteboardMessage) => void
}

interface UseWhiteboardChannelResult {
  broadcastPoint: (x: number, y: number, strokeId: string, phase: WhiteboardStrokePhase) => void
  broadcastClear: () => void
}

/**
 * `canPublishData` is granted server-side, per LiveKit token, and cryptographically signed —
 * a student's client can never forge it. That grant is the real, sufficient security boundary
 * for "only the host can write" (students are always minted with canPublishData:false), so
 * incoming messages here are trusted by topic alone rather than re-checking sender identity
 * against a single hardcoded id (which would incorrectly reject a legitimate privileged
 * co-host — section head/admin/principal — who is also granted canPublishData:true).
 */
export function useWhiteboardChannel({
  onMessage,
}: UseWhiteboardChannelOptions): UseWhiteboardChannelResult {
  const room = useRoomContext()
  const encoderRef = useRef(new TextEncoder())
  const lastBroadcastAtRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    function handleData(payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) {
      if (topic !== WHITEBOARD_DATA_TOPIC) return
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as WhiteboardMessage
        onMessageRef.current(message)
      } catch {
        // Malformed payload — ignore it, never crash the live class page over a bad stroke message.
      }
    }
    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [room])

  const broadcastPoint = useCallback(
    (x: number, y: number, strokeId: string, phase: WhiteboardStrokePhase) => {
      if (room.state !== ConnectionState.Connected) return
      const now = performance.now()
      if (now - lastBroadcastAtRef.current < BROADCAST_THROTTLE_MS) return
      lastBroadcastAtRef.current = now

      const message: WhiteboardPointMessage = { type: 'point', x, y, strokeId, phase }
      const data = encoderRef.current.encode(JSON.stringify(message))
      room.localParticipant
        .publishData(data, { reliable: false, topic: WHITEBOARD_DATA_TOPIC })
        .catch(() => {
          // Best-effort broadcast — a dropped point never blocks drawing or the video call.
        })
    },
    [room],
  )

  const broadcastClear = useCallback(() => {
    if (room.state !== ConnectionState.Connected) return
    const message: WhiteboardMessage = { type: 'clear' }
    const data = encoderRef.current.encode(JSON.stringify(message))
    room.localParticipant
      .publishData(data, { reliable: true, topic: WHITEBOARD_DATA_TOPIC })
      .catch(() => {
        // Best-effort — worst case the remote board just doesn't clear this one time.
      })
  }, [room])

  return { broadcastPoint, broadcastClear }
}
