'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

interface EditProps {
  mode: 'edit'
  values: string[]
  onChange: (updated: string[]) => void
}

interface DisplayProps {
  mode: 'display'
  values: string[]
}

type Props = EditProps | DisplayProps

export function QualificationTags(props: Props) {
  const [input, setInput] = useState('')

  if (props.mode === 'display') {
    if (!props.values?.length) return <span className="text-muted small">None listed</span>
    return (
      <div className="d-flex flex-wrap gap-2">
        {props.values.map((q, i) => (
          <span key={i} className="badge bg-light text-dark border rounded-pill px-3 py-2">
            {q}
          </span>
        ))}
      </div>
    )
  }

  const { values, onChange } = props

  const addTag = () => {
    const trimmed = input.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
    setInput('')
  }

  const removeTag = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {values.map((q, i) => (
          <span
            key={i}
            className="badge bg-light text-dark border d-flex align-items-center gap-1 px-3 py-2"
            style={{ borderRadius: 20 }}
          >
            {q}
            <button
              type="button"
              className="btn btn-link p-0 text-danger ms-1"
              style={{ lineHeight: 1, fontSize: 12 }}
              onClick={() => removeTag(i)}
              aria-label={`Remove ${q}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="input-group">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Add qualification (e.g. BSc in Education)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={addTag}
          disabled={!input.trim()}
        >
          Add
        </button>
      </div>
      <div className="form-text">Press Enter or click Add</div>
    </div>
  )
}
