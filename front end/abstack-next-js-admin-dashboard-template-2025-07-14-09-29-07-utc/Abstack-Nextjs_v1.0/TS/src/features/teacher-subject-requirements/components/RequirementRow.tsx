'use client'
import React, { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import { useUpdateRequirement } from '../hooks/useUpdateRequirement'
import { useDeleteRequirement } from '../hooks/useDeleteRequirement'
import type { TeacherSubjectClassRequirement } from '../types'

interface Props {
  req: TeacherSubjectClassRequirement
  classSectionId: number
  onError: (msg: string) => void
}

export function RequirementRow({ req, classSectionId, onError }: Props) {
  const [editing, setEditing] = useState(false)
  const [periods, setPeriods] = useState(req.periodsPerWeek)

  const update = useUpdateRequirement(classSectionId)
  const del = useDeleteRequirement(classSectionId)

  const handleSave = async () => {
    onError('')
    try {
      await update.mutateAsync({ id: req.id, periodsPerWeek: periods })
      setEditing(false)
    } catch (err: any) {
      const raw = err?.response?.data?.errors?.periodsPerWeek ?? err?.response?.data?.message
      const msg = typeof raw === 'string' ? raw : 'Failed to update requirement.'
      onError(msg)
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    onError('')
    try {
      await del.mutateAsync(req.id)
    } catch {
      onError('Failed to delete requirement.')
    }
  }

  const handleCancel = () => {
    setPeriods(req.periodsPerWeek)
    setEditing(false)
  }

  return (
    <tr>
      <td className="align-middle">
        <div className="fw-semibold small">
          {req.teacher.firstName} {req.teacher.lastName}
        </div>
        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
          {req.teacher.employeeNumber}
        </div>
      </td>
      <td className="align-middle">
        <code
          className="rounded px-2 py-1 small"
          style={{ background: '#f1f3f9', color: '#5a5c9a', fontWeight: 600 }}
        >
          {req.subject.code}
        </code>
      </td>
      <td className="align-middle">
        <div className="small fw-semibold">{req.subject.name}</div>
        <div className="mt-1">
          <CategoryBadge category={req.subject.category} size="sm" />
        </div>
      </td>
      <td className="align-middle text-center">
        {editing ? (
          <input
            type="number"
            className="form-control form-control-sm text-center"
            min={1}
            max={40}
            value={periods}
            style={{ width: 70, display: 'inline-block' }}
            onChange={(e) => setPeriods(Math.max(1, Math.min(40, Number(e.target.value))))}
          />
        ) : (
          <span
            className="badge rounded-pill fw-bold px-3 py-1"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}
          >
            {req.periodsPerWeek}
          </span>
        )}
      </td>
      <td className="align-middle text-end">
        {editing ? (
          <div className="d-flex gap-1 justify-content-end">
            <button
              className="btn btn-sm btn-success d-flex align-items-center gap-1"
              disabled={update.isPending}
              onClick={handleSave}
            >
              {update.isPending ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <Check size={13} />
              )}
              Save
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={handleCancel}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="d-flex gap-1 justify-content-end">
            <button
              className="btn btn-sm btn-outline-primary"
              title="Edit"
              onClick={() => setEditing(true)}
            >
              <Pencil size={13} />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              title="Delete"
              disabled={del.isPending}
              onClick={handleDelete}
            >
              {del.isPending ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
