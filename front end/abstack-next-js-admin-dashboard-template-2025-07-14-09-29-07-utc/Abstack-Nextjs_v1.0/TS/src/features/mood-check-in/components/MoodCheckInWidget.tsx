'use client'
import { useTodayMoodStatus } from '../hooks/useTodayMoodStatus'
import { useSubmitMoodCheckIn } from '../hooks/useSubmitMoodCheckIn'
import { MOOD_OPTIONS } from '../types'

export function MoodCheckInWidget() {
  const { data: status, isLoading } = useTodayMoodStatus()
  const submit = useSubmitMoodCheckIn()

  const selectedValue = status?.moodValue ?? null

  return (
    <div
      className="card border-0 shadow-sm mb-4"
      style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)' }}
    >
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <span className="fw-semibold small" style={{ color: '#9a3412' }}>
            How are you feeling today?
          </span>
          <span className="text-muted" style={{ fontSize: 11 }}>Totally optional</span>
        </div>

        {isLoading ? (
          <div className="d-flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="placeholder rounded-circle" style={{ width: 40, height: 40 }} />
            ))}
          </div>
        ) : (
          <div className="d-flex gap-2">
            {MOOD_OPTIONS.map((opt) => {
              const isSelected = selectedValue === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="btn d-flex align-items-center justify-content-center rounded-circle border-0"
                  title={opt.label}
                  aria-label={opt.label}
                  onClick={() => submit.mutate(opt.value)}
                  disabled={submit.isPending}
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 22,
                    background: isSelected ? '#fed7aa' : 'rgba(255,255,255,0.7)',
                    boxShadow: isSelected ? '0 0 0 2px #fb923c' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.emoji}
                </button>
              )
            })}
          </div>
        )}

        {selectedValue && (
          <p className="text-muted mb-0 mt-2" style={{ fontSize: 12 }}>
            Thanks for sharing — you can change this anytime today.
          </p>
        )}
      </div>
    </div>
  )
}
