# Air-Writing Latency Manual Test Plan

LMS-130's acceptance criterion is "latency between finger movement and rendered stroke feels usable for live teaching (target under 200ms)." There is no reliable way to simulate a real camera + network path in an automated test, so this is measured manually. Requires the LiveKit connection credentials (`LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`) to be configured first.

## Setup

1. Two browser sessions on the same machine (or two devices on the same network) — one logged in as the hosting teacher, one as a student in that class section.
2. Teacher: open the live class host page, start the session, click **Start Air-Writing**.
3. Student: join the same live class from the other session.

## Method 1 — timestamp diffing (objective)

1. Open the browser DevTools console on both sessions.
2. On the teacher side, temporarily log `performance.now()` right before each `broadcastPoint` call in `useWhiteboardChannel.ts`.
3. On the student side, temporarily log `performance.now()` inside `handleData` in the same file, as soon as a `'point'` message is decoded.
4. Write a few strokes, note several timestamp pairs from both consoles for points you can visually correlate (e.g. the first point of a stroke), and compute the difference in milliseconds.
5. Target: **the median difference should be under 200ms**. A single-digit-ms local-network test won't fully represent real-world conditions (Wi-Fi, distant regions) — repeat on a real network / two separate physical locations if possible before treating this as final.

## Method 2 — screen recording (subjective, closer to the real teaching experience)

1. Position both browser windows side by side (or record both screens simultaneously, e.g. via a phone camera pointed at two monitors, or two separate screen recordings with a shared visible clock/stopwatch overlay).
2. Write a simple shape (e.g. a circle or the letter "A") on the teacher side while recording both screens.
3. Step through the recording frame-by-frame (or count video frames at 30/60fps) between the moment the finger visibly moves on the teacher's camera feed and the moment the corresponding stroke segment appears on the student's screen.
4. At 30fps, a difference of ≤6 frames ≈ 200ms.

## Subjective usability check

Beyond the numeric target, have the person acting as "teacher" actually try teaching a short concept (e.g. writing a simple equation) while narrating out loud, and ask: does the stroke feel like it's keeping up with your hand, or does it feel like there's a noticeable, distracting lag? This is ultimately what "usable for live teaching" means in the acceptance criteria — the numeric target is a proxy for this.

## Known latency contributors, if the target isn't met

- Detection interval (`DETECTION_INTERVAL_MS` in `useHandTracking.ts`, currently 40ms/~25fps) — lowering this increases responsiveness but costs more CPU per frame.
- Broadcast throttle (`BROADCAST_THROTTLE_MS` in `useWhiteboardChannel.ts`, currently 40ms) — matched to the detection interval; lowering it without lowering detection interval won't help since points aren't produced faster.
- `hand-pose-detection`'s `modelType: 'lite'` (used here for speed) vs `'full'` (higher accuracy, slower inference) — already defaulted to `'lite'` for latency.
- Network round-trip to the LiveKit server itself (outside this app's control) — a school with a geographically distant LiveKit region will see higher latency regardless of client-side tuning.
