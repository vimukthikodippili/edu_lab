'use client'
import React, { useState } from 'react'
import { BookOpen, Layers, Plus, Trash2 } from 'lucide-react'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import type { Student } from '@/features/students/types'
import { useStudentEnrollments } from '../hooks/useStudentEnrollments'
import { useRemoveEnrollment } from '../hooks/useRemoveEnrollment'
import { useStreams } from '../hooks/useStreams'
import { useAssignStream } from '../hooks/useAssignStream'
import { ALStreamBadge } from './ALStreamBadge'
import { AddSubjectsModal } from './AddSubjectsModal'

interface Props {
  student: Student
}

export function SubjectEnrollmentSection({ student }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingSubjectId, setRemovingSubjectId] = useState<string | null>(null)
  const [selectedStreamId, setSelectedStreamId] = useState<number | ''>('')
  const [showStreamConfirm, setShowStreamConfirm] = useState(false)

  const { data: enrollments = [], isLoading } = useStudentEnrollments(student.id)
  const { data: streams = [] } = useStreams()
  const removeEnrollment = useRemoveEnrollment(student.id)
  const assignStream = useAssignStream(student.id)

  const isCollegiate = student.grade?.stage === 'collegiate'

  const handleRemove = async (subjectId: string) => {
    if (!confirm('Remove this subject from the student\'s enrollment?')) return
    setRemovingSubjectId(subjectId)
    try {
      await removeEnrollment.mutateAsync(subjectId)
    } finally {
      setRemovingSubjectId(null)
    }
  }

  const handleAssignStream = async () => {
    if (!selectedStreamId) return
    await assignStream.mutateAsync({ streamId: Number(selectedStreamId) })
    setShowStreamConfirm(false)
    setSelectedStreamId('')
  }

  const handleRemoveStream = async () => {
    if (!confirm('Remove stream assignment? The student\'s enrolled subjects will be preserved.')) return
    await assignStream.mutateAsync({ streamId: null })
  }

  const selectedStream = streams.find((s) => s.id === selectedStreamId)

  return (
    <>
      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 d-flex align-items-center justify-content-between py-3 px-4"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="d-flex align-items-center gap-2 text-white">
            <BookOpen size={18} />
            <span className="fw-semibold">Enrolled Subjects</span>
            {!isLoading && (
              <span className="badge bg-white bg-opacity-25 rounded-pill ms-1 small">
                {enrollments.length}
              </span>
            )}
          </div>
          <button
            className="btn btn-sm btn-light btn-light-hover d-flex align-items-center gap-1"
            style={{ fontSize: '0.82rem' }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} />
            Add Subjects
          </button>
        </div>

        <div className="card-body p-0">
          {/* Subject table */}
          {isLoading ? (
            <div className="p-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="d-flex gap-3 align-items-center py-2 border-bottom">
                  <div className="placeholder-glow flex-grow-1">
                    <span className="placeholder col-8 rounded" style={{ height: 14 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <BookOpen size={36} className="mb-2 opacity-25" />
              <p className="mb-1 small fw-medium">No subjects enrolled</p>
              <p className="mb-0 text-muted" style={{ fontSize: '0.78rem' }}>
                Click <strong>Add Subjects</strong> to assign subjects to this student
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th className="ps-4 py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Code</th>
                    <th className="py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Subject</th>
                    <th className="py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Category</th>
                    <th className="py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Enrolled</th>
                    <th className="pe-4 py-2 text-end" style={{ fontSize: '0.7rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td className="ps-4">
                        <code
                          className="badge bg-dark-subtle text-dark fw-semibold"
                          style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}
                        >
                          {e.subject.code}
                        </code>
                      </td>
                      <td className="small fw-medium">{e.subject.name}</td>
                      <td>
                        <CategoryBadge category={e.subject.category} size="sm" />
                      </td>
                      <td className="text-muted small">
                        {new Date(e.enrolledAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="pe-4 text-end">
                        <button
                          className="btn btn-sm btn-outline-danger border-0 p-1"
                          title="Remove subject"
                          disabled={removingSubjectId === e.subjectId}
                          onClick={() => handleRemove(e.subjectId)}
                        >
                          {removingSubjectId === e.subjectId ? (
                            <span className="spinner-border spinner-border-sm" style={{ width: 13, height: 13 }} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* A/L Stream panel — only for collegiate students */}
          {isCollegiate && (
            <div className="border-top px-4 py-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Layers size={15} className="text-purple" style={{ color: '#764ba2' }} />
                <span className="fw-semibold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.06em', color: '#764ba2' }}>
                  A/L Stream
                </span>
              </div>

              <div className="d-flex align-items-center flex-wrap gap-3">
                {student.stream ? (
                  <>
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted">Current:</span>
                      <ALStreamBadge stream={student.stream} />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 160 }}
                        value={selectedStreamId}
                        onChange={(e) => setSelectedStreamId(e.target.value === '' ? '' : Number(e.target.value))}
                      >
                        <option value="">Change stream...</option>
                        {streams.filter((s) => s.isActive && s.id !== student.stream?.id).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {selectedStreamId && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setShowStreamConfirm(true)}
                        >
                          Assign
                        </button>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={assignStream.isPending}
                      onClick={handleRemoveStream}
                    >
                      Remove Stream
                    </button>
                  </>
                ) : (
                  <>
                    <span className="badge bg-light text-muted border small">No stream assigned</span>
                    <div className="d-flex align-items-center gap-2">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 200 }}
                        value={selectedStreamId}
                        onChange={(e) => setSelectedStreamId(e.target.value === '' ? '' : Number(e.target.value))}
                      >
                        <option value="">Select stream...</option>
                        {streams.filter((s) => s.isActive).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {selectedStreamId && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={assignStream.isPending}
                          onClick={() => setShowStreamConfirm(true)}
                        >
                          Assign Stream
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add subjects modal */}
      {showAddModal && (
        <AddSubjectsModal
          studentId={student.id}
          enrollments={enrollments}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Stream assign confirmation */}
      {showStreamConfirm && selectedStream && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1060,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div className="bg-white rounded-3 shadow-lg p-4" style={{ width: 440 }}>
            <h6 className="fw-bold mb-3">Assign Stream</h6>
            <p className="small text-muted mb-3">
              This will assign the <strong>{selectedStream.name}</strong> stream and pre-populate its
              default subjects into this student&apos;s enrollment. Any subjects already enrolled will be
              preserved.
            </p>
            <p className="small text-muted mb-4">Continue?</p>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowStreamConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-primary"
                disabled={assignStream.isPending}
                onClick={handleAssignStream}
              >
                {assignStream.isPending && <span className="spinner-border spinner-border-sm me-1" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
