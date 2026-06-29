'use client'
import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useCreateRequirement } from '../hooks/useCreateRequirement'

interface Props {
  classSectionId: number
  availablePeriods: number | null
}

export function AddRequirementForm({ classSectionId, availablePeriods }: Props) {
  const [open, setOpen] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [periods, setPeriods] = useState(1)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: staffData } = useStaff({ status: 'active', limit: 100 } as any)
  const { data: subjectsData } = useSubjects({ limit: 100 })
  const create = useCreateRequirement(classSectionId)

  const staff = staffData?.data ?? []
  const subjects = subjectsData?.data ?? []

  const wouldExceed =
    availablePeriods !== null && periods > availablePeriods

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      await create.mutateAsync({ teacherId, subjectId, classSectionId, periodsPerWeek: periods })
      setTeacherId('')
      setSubjectId('')
      setPeriods(1)
      setOpen(false)
    } catch (err: any) {
      const raw =
        err?.response?.data?.errors?.periodsPerWeek ??
        err?.response?.data?.message ??
        'Failed to add requirement.'
      setErrorMsg(typeof raw === 'string' ? raw : JSON.stringify(raw))
    }
  }

  if (!open) {
    return (
      <div className="d-flex justify-content-end mt-3">
        <button
          className="btn btn-sm btn-primary d-flex align-items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <Plus size={14} /> Add Requirement
        </button>
      </div>
    )
  }

  return (
    <div
      className="mt-3 p-3 rounded-2 border"
      style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}
    >
      <div className="small fw-bold text-muted mb-2 d-flex align-items-center justify-content-between">
        <span>New Period Requirement</span>
        <button className="btn-close btn-sm" onClick={() => { setOpen(false); setErrorMsg('') }} />
      </div>

      {errorMsg && (
        <div className="alert alert-danger py-2 small mb-2">{errorMsg}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-2 align-items-end">
          {/* Teacher */}
          <div className="col-12 col-md-4">
            <label className="form-label form-label-sm fw-semibold mb-1">Teacher</label>
            <select
              className="form-select form-select-sm"
              value={teacherId}
              required
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">— Select teacher —</option>
              {staff
                .slice()
                .sort((a, b) => a.firstName.localeCompare(b.firstName))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
            </select>
          </div>

          {/* Subject */}
          <div className="col-12 col-md-4">
            <label className="form-label form-label-sm fw-semibold mb-1">Subject</label>
            <select
              className="form-select form-select-sm"
              value={subjectId}
              required
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">— Select subject —</option>
              {subjects
                .slice()
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}: {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Periods */}
          <div className="col-6 col-md-2">
            <label className="form-label form-label-sm fw-semibold mb-1">Periods/Week</label>
            <input
              type="number"
              className={`form-control form-control-sm ${wouldExceed ? 'border-warning' : ''}`}
              min={1}
              max={40}
              value={periods}
              onChange={(e) => setPeriods(Math.max(1, Math.min(40, Number(e.target.value))))}
            />
            {wouldExceed && (
              <div className="form-text text-warning small">
                Exceeds {availablePeriods} available
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="col-6 col-md-2 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
              disabled={create.isPending || !teacherId || !subjectId}
            >
              {create.isPending ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <Plus size={13} />
              )}
              Add
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
