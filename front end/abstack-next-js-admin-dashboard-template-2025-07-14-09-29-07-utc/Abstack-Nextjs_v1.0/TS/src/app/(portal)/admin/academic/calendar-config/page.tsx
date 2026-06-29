'use client'
import { Settings } from 'lucide-react'
import { useCalendarConfigs } from '@/features/school-calendar-config/hooks/useCalendarConfigs'
import { CalendarConfigCard } from '@/features/school-calendar-config/components/CalendarConfigCard'

const STAGE_ORDER = ['primary', 'junior_secondary', 'senior_secondary', 'collegiate'] as const

function SkeletonCard() {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div
        className="card-header border-0 py-3 px-4"
        style={{ background: '#e9ecef', minHeight: 72 }}
      >
        <div className="placeholder-glow">
          <span className="placeholder col-6 rounded" />
          <br />
          <span className="placeholder col-4 rounded mt-1" />
        </div>
      </div>
      <div className="card-body px-4 py-3 d-flex flex-column gap-3">
        <div className="placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
        <div className="placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
        <div className="placeholder-glow">
          <span className="placeholder col-12 rounded" style={{ height: 48 }} />
        </div>
        <div className="d-flex justify-content-end">
          <span className="placeholder col-4 rounded" style={{ height: 30 }} />
        </div>
      </div>
    </div>
  )
}

export default function CalendarConfigPage() {
  const { data: configs, isLoading, isError } = useCalendarConfigs()

  // Sort API result into canonical stage order
  const sorted = configs
    ? STAGE_ORDER.map((s) => configs.find((c) => c.gradeStage === s)).filter(Boolean)
    : []

  return (
    <div className="container-fluid px-4 py-4">
      {/* Page header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Settings size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Calendar Configuration</h4>
          <p className="text-muted small mb-0">
            Set working days and periods per day for each grade stage. Changes are
            used by the timetable engine to calculate available weekly slots.
          </p>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="alert alert-danger">
          Failed to load calendar configurations. Please refresh the page.
        </div>
      )}

      {/* Cards grid */}
      <div className="row g-4 row-cols-1 row-cols-md-2">
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="col">
                <SkeletonCard />
              </div>
            ))
          : sorted.map((config) =>
              config ? (
                <div key={config.gradeStage} className="col">
                  <CalendarConfigCard config={config} />
                </div>
              ) : null,
            )}
      </div>
    </div>
  )
}
