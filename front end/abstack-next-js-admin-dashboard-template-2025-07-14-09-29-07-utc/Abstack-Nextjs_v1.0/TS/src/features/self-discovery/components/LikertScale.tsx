'use client'

interface Props {
  value: number | undefined
  onChange: (value: number) => void
  lowLabel: string
  highLabel: string
}

export function LikertScale({ value, onChange, lowLabel, highLabel }: Props) {
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`btn rounded-circle d-flex align-items-center justify-content-center ${value === n ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ width: 44, height: 44, fontWeight: 600 }}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="d-flex align-items-center justify-content-between mt-1">
        <small className="text-muted">{lowLabel}</small>
        <small className="text-muted">{highLabel}</small>
      </div>
    </div>
  )
}
