'use client'
import { forwardRef } from 'react'
import { Form } from 'react-bootstrap'

const STAGES = [
  { label: 'Primary', grades: [1, 2, 3, 4, 5] },
  { label: 'Junior Secondary', grades: [6, 7, 8, 9] },
  { label: 'Senior Secondary', grades: [10, 11] },
  { label: 'Collegiate (A/L)', grades: [12, 13] },
]

interface SriLankaGradeSelectProps {
  value?: number | null
  onChange?: (grade: number | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  isInvalid?: boolean
  name?: string
  id?: string
}

const SriLankaGradeSelect = forwardRef<HTMLSelectElement, SriLankaGradeSelectProps>(
  ({ value, onChange, placeholder = 'Select Grade', disabled, required, isInvalid, name, id }, ref) => {
    return (
      <Form.Select
        ref={ref}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        required={required}
        isInvalid={isInvalid}
        name={name}
        id={id}
      >
        <option value="">{placeholder}</option>
        {STAGES.map((stage) => (
          <optgroup key={stage.label} label={stage.label}>
            {stage.grades.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </optgroup>
        ))}
      </Form.Select>
    )
  }
)

SriLankaGradeSelect.displayName = 'SriLankaGradeSelect'
export default SriLankaGradeSelect
