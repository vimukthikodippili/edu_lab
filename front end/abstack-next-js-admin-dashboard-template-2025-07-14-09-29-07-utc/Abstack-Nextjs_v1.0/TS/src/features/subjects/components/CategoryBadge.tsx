'use client'
import type { SubjectCategory } from '../types'

interface CategoryBadgeProps {
  category: SubjectCategory
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  return (
    <span
      className={`badge rounded-pill fw-semibold ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-1'}`}
      style={{
        backgroundColor: category.color,
        color: '#fff',
        fontSize: size === 'sm' ? '0.7rem' : '0.78rem',
        letterSpacing: '0.01em',
      }}
    >
      {category.name}
    </span>
  )
}
