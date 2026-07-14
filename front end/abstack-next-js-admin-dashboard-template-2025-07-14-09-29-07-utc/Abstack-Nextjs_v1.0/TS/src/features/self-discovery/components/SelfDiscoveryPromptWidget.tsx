'use client'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'

const MIN_GRADE_LEVEL = 9

export function SelfDiscoveryPromptWidget() {
  const { data: myStudent } = useMyStudent()

  if (!myStudent || myStudent.grade.level < MIN_GRADE_LEVEL) return null

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-body d-flex align-items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}
      >
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Compass size={20} className="text-white" />
        </div>
        <div className="flex-grow-1">
          <p className="fw-semibold mb-0" style={{ fontSize: 14 }}>Explore Your Personality & Interests</p>
          <p className="text-muted mb-0" style={{ fontSize: 12 }}>
            A short self-discovery questionnaire — for your own exploration, not a decision about your subjects.
          </p>
        </div>
        <Link href="/student/self-discovery" className="btn btn-sm btn-primary flex-shrink-0">
          Start
        </Link>
      </div>
    </div>
  )
}
