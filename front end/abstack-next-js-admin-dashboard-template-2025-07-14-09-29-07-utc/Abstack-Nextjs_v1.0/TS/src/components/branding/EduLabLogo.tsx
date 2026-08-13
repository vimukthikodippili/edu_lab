import Image from 'next/image'
import eduLabLogoSrc from '@/assets/images/brand/edulab-logo.jpg'

interface EduLabLogoProps {
  /** Icon-only mark, or the mark plus the "EduLab" wordmark beside it. */
  variant?: 'mark' | 'full'
  /** Height of the icon in px. The wordmark (if shown) scales proportionally. */
  size?: number
  /** Render the mark on its own white rounded chip so it stays legible on the navy brand panel
   * (or any other background). Off by default for `full` at very large hero sizes, where the
   * mark usually already sits on a light card. */
  chip?: boolean
  className?: string
}

// Real source asset (`assets/images/brand/edulab-logo.jpg`) is a 1376x768 white-background lockup
// with the icon stacked above the "EduLab" wordmark — at the small sizes this component actually
// renders at (22-48px), showing that whole stacked image would make the wordmark illegibly tiny.
// So only the icon is used as an image (cropped out of the full asset in pure CSS — no
// image-processing tooling is available in this environment, so this is an oversized/positioned
// <Image> inside an overflow:hidden box, not a pre-cropped file); "EduLab" keeps rendering as live
// text next to it, same as before, via the already-theme-aware --edulab-wordmark var.
const SOURCE_WIDTH = 1376
const SOURCE_HEIGHT = 768
// Estimated bounding box of the brain icon within the source image (source px) — an approximation
// from visual inspection, not a measured crop; may need a small nudge once seen in the browser.
const ICON_CROP = { x: 474, y: 103, size: 420 }

/**
 * The EduLab brand mark, used everywhere the app shows its logo — the login/logout pages
 * (`app/(other)/auth/login`, `.../logout`) and the global sidebar/topbar (`components/LogoBox.tsx`).
 * The "EduLab" wordmark is live-rendered text (via `--edulab-wordmark`, theme-aware), not baked
 * into the mark artwork, so it stays legible on any background without a separate light/dark
 * asset variant.
 */
export function EduLabLogo({ variant = 'full', size = 40, chip = true, className }: EduLabLogoProps) {
  // Tight, closely-hugging padding + a soft "squircle" radius — reads as an intentional icon
  // badge (the same pattern Slack/Linear/Vercel use for a mark on a dark sidebar) rather than a
  // loosely-floating white box, which is what the previous looser padding + blockier corner read
  // as once the sidebar/topbar went navy.
  const chipPad = chip ? size * 0.14 : 0
  const boxSize = size + chipPad * 2
  const scale = boxSize / ICON_CROP.size

  const mark = (
    <span
      className={chip ? undefined : className}
      style={{
        display: 'inline-block',
        position: 'relative',
        width: boxSize,
        height: boxSize,
        borderRadius: chip ? boxSize * 0.32 : 0,
        overflow: 'hidden',
        background: chip ? 'var(--edulab-chip-bg, #ffffff)' : 'transparent',
        flexShrink: 0,
      }}
    >
      <Image
        src={eduLabLogoSrc}
        alt="EduLab"
        width={SOURCE_WIDTH}
        height={SOURCE_HEIGHT}
        style={{
          position: 'absolute',
          maxWidth: 'none',
          width: SOURCE_WIDTH * scale,
          height: SOURCE_HEIGHT * scale,
          left: -ICON_CROP.x * scale,
          top: -ICON_CROP.y * scale,
        }}
      />
    </span>
  )

  if (variant === 'mark') {
    return mark
  }

  return (
    <span className={`d-inline-flex align-items-center gap-2 ${className ?? ''}`}>
      {mark}
      <span
        style={{
          fontFamily: "'Cascadia Code','Consolas','SF Mono',monospace",
          fontWeight: 700,
          fontSize: size * 0.62,
          letterSpacing: '-0.01em',
          color: 'var(--edulab-wordmark, currentColor)',
        }}
      >
        EduLab
      </span>
    </span>
  )
}
