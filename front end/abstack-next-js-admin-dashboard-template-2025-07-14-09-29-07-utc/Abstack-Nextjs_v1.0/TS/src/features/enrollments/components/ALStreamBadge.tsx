import React from 'react'
import type { ALStream } from '../types'

const STREAM_COLORS: Record<string, string> = {
  biology: '#20c997',
  maths: '#0d6efd',
  commerce: '#fd7e14',
  technology: '#6f42c1',
  arts: '#e91e63',
}

function getStreamColor(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '')
  for (const [k, color] of Object.entries(STREAM_COLORS)) {
    if (key.includes(k)) return color
  }
  // Deterministic fallback from name hash
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const palette = ['#198754', '#dc3545', '#0dcaf0', '#6610f2', '#d63384']
  return palette[h % palette.length]
}

interface Props {
  stream: ALStream
  size?: 'sm' | 'md'
}

export function ALStreamBadge({ stream, size = 'md' }: Props) {
  const color = getStreamColor(stream.name)
  const fontSize = size === 'sm' ? '0.7rem' : '0.8rem'
  return (
    <span
      className="badge rounded-pill"
      style={{ backgroundColor: color, fontSize, padding: size === 'sm' ? '3px 8px' : '4px 10px' }}
    >
      {stream.name}
    </span>
  )
}
