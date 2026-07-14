'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { Track, type Room } from 'livekit-client'
import type { HandDetector } from '@tensorflow-models/hand-pose-detection'
import { smoothPoint, type Point } from '../utils/smoothPoint'
import { shouldStartNewStroke } from '../utils/strokeSegmentation'
import { computeDistance, isPinching } from '../utils/pinchGesture'
import type { WhiteboardStrokePhase } from '../types'

const INDEX_FINGERTIP_LANDMARK = 8
const THUMB_TIP_LANDMARK = 4
const WRIST_LANDMARK = 0
const MIDDLE_FINGER_MCP_LANDMARK = 9
// Ratio of (thumb-tip to index-tip distance) / (wrist to middle-finger-MCP distance, a stable
// palm-size reference) — normalizing by hand scale keeps this threshold meaningful regardless
// of how close the hand is to the camera. Empirically reasonable for this landmark topology;
// tune here if pinch detection feels too eager/reluctant.
const PINCH_THRESHOLD_RATIO = 0.4
const SMOOTHING_WINDOW = 5
// Generous relative to the detection loop's own cadence — 'lite' model inference on modest
// hardware can genuinely take several hundred ms per frame, especially unwarmed. Too tight a
// threshold here means slow-but-successive detections keep getting misread as separate strokes,
// so `stroke.length` never reaches 2 and nothing ever renders even though hands ARE detected.
const NEW_STROKE_GAP_MS = 600
const DETECTION_INTERVAL_MS = 40 // ~25fps cap — matches the broadcast throttle in useWhiteboardChannel
const CAMERA_TRACK_WAIT_TIMEOUT_MS = 12000

/** `getTrackPublication(Track.Source.Camera)` requires the publication's `.source` to have been
 * tagged exactly `Track.Source.Camera` — fall back to scanning all video publications for any
 * live track so a source-tagging edge case (e.g. a track republished without that metadata)
 * doesn't strand this lookup even while the camera is visibly live elsewhere in the UI. */
function findLocalCameraTrack(room: Room): MediaStreamTrack | undefined {
  const direct = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStreamTrack
  if (direct) return direct
  for (const pub of room.localParticipant.videoTrackPublications.values()) {
    if (pub.videoTrack?.mediaStreamTrack) return pub.videoTrack.mediaStreamTrack
  }
  return undefined
}

async function waitForLocalCameraTrack(room: Room): Promise<MediaStreamTrack> {
  const deadline = Date.now() + CAMERA_TRACK_WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    const track = findLocalCameraTrack(room)
    if (track) return track
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  console.warn('[air-writing] camera track wait timed out', {
    isCameraEnabled: room.localParticipant.isCameraEnabled,
    publications: room.localParticipant.getTrackPublications().map((p) => ({
      source: p.source,
      kind: p.kind,
      hasTrack: !!p.track,
    })),
  })
  throw new Error('Your camera needs to be on before starting air-writing.')
}

interface UseHandTrackingOptions {
  onPoint: (point: Point, phase: WhiteboardStrokePhase) => void
  /** Fired only on an actual pinch-state transition, not every frame. */
  onPinchChange?: (isPinching: boolean) => void
}

interface UseHandTrackingResult {
  isActive: boolean
  isModelLoading: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

/**
 * Reuses the same MediaStreamTrack already published to LiveKit for the video call, rather
 * than opening a second independent getUserMedia stream — many webcams (especially external
 * USB ones) don't support two concurrent capture sessions well, and a second stream can come
 * back black/frozen while the first (the actual video call) keeps working fine, making
 * detection silently fail with no visible error. Because the track is owned by LiveKit, `stop()`
 * here never calls `track.stop()` — that would kill the teacher's video call too.
 */
export function useHandTracking({
  onPoint,
  onPinchChange,
}: UseHandTrackingOptions): UseHandTrackingResult {
  const room = useRoomContext()
  const [isActive, setIsActive] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef<HandDetector | null>(null)
  const rafRef = useRef<number | null>(null)
  const historyRef = useRef<Point[]>([])
  const lastSeenAtRef = useRef<number | null>(null)
  const lastDetectAtRef = useRef(0)
  const isDetectingRef = useRef(false)
  const wasPinchingRef = useRef(false)
  const lastLoggedFrameErrorAtRef = useRef(0)
  const onPointRef = useRef(onPoint)
  onPointRef.current = onPoint
  const onPinchChangeRef = useRef(onPinchChange)
  onPinchChangeRef.current = onPinchChange

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }
    detectorRef.current?.dispose()
    detectorRef.current = null
    historyRef.current = []
    lastSeenAtRef.current = null
    wasPinchingRef.current = false
    setIsActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setIsModelLoading(true)
    try {
      const [tf, handPoseDetection, cameraTrack] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/hand-pose-detection'),
        waitForLocalCameraTrack(room),
      ])
      await tf.ready()

      const video = document.createElement('video')
      video.srcObject = new MediaStream([cameraTrack])
      video.muted = true
      video.playsInline = true
      await video.play()
      // hand-pose-detection's internal getImageSize() reads a plain (non-tensor) element's
      // .width/.height ATTRIBUTES, not .videoWidth/.videoHeight — an unset video element
      // reports 0x0 to it, corrupting its whole coordinate-transform pipeline into NaN even
      // though .videoWidth/.videoHeight (used elsewhere in this file) are correctly populated.
      video.width = video.videoWidth
      video.height = video.videoHeight
      videoRef.current = video

      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 1 },
      )
      detectorRef.current = detector

      setIsModelLoading(false)
      setIsActive(true)

      const loop = (now: number) => {
        if (!detectorRef.current || !videoRef.current) return
        // Never start a new estimateHands call while one is still in flight — 'lite' model
        // inference can take longer than DETECTION_INTERVAL_MS, and letting calls overlap
        // makes them finish out of order, corrupting the stroke-gap timing below.
        if (!isDetectingRef.current && now - lastDetectAtRef.current >= DETECTION_INTERVAL_MS) {
          lastDetectAtRef.current = now
          void detectFrame(now)
        }
        rafRef.current = requestAnimationFrame(loop)
      }

      const detectFrame = async (now: number) => {
        const detector = detectorRef.current
        const video = videoRef.current
        if (!detector || !video || !video.videoWidth || !video.videoHeight) return
        isDetectingRef.current = true
        try {
          const hands = await detector.estimateHands(video, { flipHorizontal: false })
          const completedAt = performance.now()
          const keypoints = hands[0]?.keypoints
          const fingertip = keypoints?.[INDEX_FINGERTIP_LANDMARK]
          const thumbTip = keypoints?.[THUMB_TIP_LANDMARK]
          const wrist = keypoints?.[WRIST_LANDMARK]
          const middleMcp = keypoints?.[MIDDLE_FINGER_MCP_LANDMARK]

          // Pinch distance/ratio is computed in raw pixel space (never the [0,1]-normalized
          // coordinates used for stroke rendering below) — dividing x by video width and y by
          // video height separately would distort Euclidean distances on a non-square video.
          const pinching =
            !!(fingertip && thumbTip && wrist && middleMcp) &&
            isPinching(
              computeDistance(thumbTip, fingertip) / computeDistance(wrist, middleMcp),
              PINCH_THRESHOLD_RATIO,
            )

          if (pinching !== wasPinchingRef.current) {
            wasPinchingRef.current = pinching
            onPinchChangeRef.current?.(pinching)
          }

          if (pinching) {
            // Pen lifted — deterministically break the current stroke so the point after
            // release always starts a fresh one, regardless of how briefly the pinch lasted
            // (rather than relying on NEW_STROKE_GAP_MS happening to have elapsed).
            lastSeenAtRef.current = null
            historyRef.current = []
            return
          }

          if (!fingertip) return

          // Mirror horizontally (selfie-view convention) and normalize to [0,1].
          const raw: Point = {
            x: 1 - fingertip.x / video.videoWidth,
            y: fingertip.y / video.videoHeight,
          }
          const isNewStroke = shouldStartNewStroke(lastSeenAtRef.current, completedAt, NEW_STROKE_GAP_MS)
          if (isNewStroke) historyRef.current = []
          historyRef.current.push(raw)
          const smoothed = smoothPoint(historyRef.current, SMOOTHING_WINDOW)
          lastSeenAtRef.current = completedAt
          onPointRef.current(smoothed, isNewStroke ? 'start' : 'draw')
        } catch (err) {
          // A single failed inference frame is not fatal — the loop stays alive. Log at most
          // once every 5s so a persistent failure is still visible without flooding the console.
          if (now - lastLoggedFrameErrorAtRef.current > 5000) {
            lastLoggedFrameErrorAtRef.current = now
            console.warn('[air-writing] hand detection frame failed', err)
          }
        } finally {
          isDetectingRef.current = false
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      console.error('[air-writing] failed to start hand tracking', err)
      setIsModelLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to start air-writing.')
      stop()
    }
  }, [stop, room])

  useEffect(() => stop, [stop])

  return { isActive, isModelLoading, error, start, stop }
}
