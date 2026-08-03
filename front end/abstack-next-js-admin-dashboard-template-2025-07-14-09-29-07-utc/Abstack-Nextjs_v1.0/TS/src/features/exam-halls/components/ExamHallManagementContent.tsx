'use client'
import { useState } from 'react'
import { Building2, Plus, Users } from 'lucide-react'
import { useExamHalls } from '../hooks/useExamHalls'
import { useCreateExamHall } from '../hooks/useCreateExamHall'
import { useNotificationContext } from '@/context/useNotificationContext'

export function ExamHallManagementContent() {
  const { data: halls, isLoading } = useExamHalls()
  const createHall = useCreateExamHall()
  const { showNotification } = useNotificationContext()

  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [rowCount, setRowCount] = useState(6)
  const [columnCount, setColumnCount] = useState(6)

  const handleCreate = () => {
    if (!name.trim()) {
      showNotification({ variant: 'danger', message: 'Hall name is required.' })
      return
    }
    createHall.mutate(
      { name: name.trim(), building: building.trim() || undefined, floor: floor.trim() || undefined, rowCount, columnCount },
      {
        onSuccess: (result) => {
          showNotification({ variant: 'success', message: `${result.hall.name} registered with ${result.seats.length} seats.` })
          setName('')
          setBuilding('')
          setFloor('')
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not register this hall.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Exam Halls</h4>
          <p className="text-muted small mb-0">Register halls with a seat layout — seats are auto-generated (A1, A2, B1…).</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Hall Name</label>
              <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Hall" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Building</label>
              <input type="text" className="form-control" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Administration Block" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Floor</label>
              <input type="text" className="form-control" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Ground Floor" />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Rows</label>
              <input type="number" min={1} className="form-control" value={rowCount} onChange={(e) => setRowCount(Number(e.target.value))} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Seats per Row</label>
              <input type="number" min={1} className="form-control" value={columnCount} onChange={(e) => setColumnCount(Number(e.target.value))} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold d-block">Capacity</label>
              <span className="fw-bold fs-5">{rowCount * columnCount}</span> seats
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button type="button" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1" disabled={createHall.isPending} onClick={handleCreate}>
                <Plus size={16} /> {createHall.isPending ? 'Registering…' : 'Register Hall'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white">Hall Directory</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !halls?.length ? (
            <div className="p-5 text-center text-muted">
              <Building2 size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No exam halls registered yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Hall</th>
                    <th>Location</th>
                    <th>Layout</th>
                    <th className="pe-4">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {halls.map((hall) => (
                    <tr key={hall.id}>
                      <td className="ps-4 fw-semibold small">{hall.name}</td>
                      <td className="small">{[hall.building, hall.floor].filter(Boolean).join(' · ') || '-'}</td>
                      <td className="small">{hall.rowCount} rows × {hall.columnCount} seats</td>
                      <td className="pe-4 small d-flex align-items-center gap-1">
                        <Users size={13} /> {hall.capacity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
