'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { DoorOpen, Download, Plus } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useClassRooms } from '@/features/class-rooms/hooks/useClassRooms'
import { useCreateClassRoom } from '@/features/class-rooms/hooks/useCreateClassRoom'
import { useGenerateQrPdf } from '@/features/class-rooms/hooks/useGenerateQrPdf'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as ApiError)?.response?.data?.message
  return message ?? fallback
}

function checkInUrlFor(roomId: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/checkin/room/${roomId}`
}

function RoomsPage() {
  const { showNotification } = useNotificationContext()
  const { data: rooms, isLoading } = useClassRooms()
  const createRoom = useCreateClassRoom()
  const generatePdf = useGenerateQrPdf()
  const [roomNumber, setRoomNumber] = useState('')

  const handleAddRoom = () => {
    const trimmed = roomNumber.trim()
    if (!trimmed) {
      showNotification({ variant: 'warning', message: 'Enter a room number first.' })
      return
    }
    createRoom.mutate(trimmed, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: `Room "${trimmed}" added.` })
        setRoomNumber('')
      },
      onError: (err) => {
        showNotification({
          variant: 'danger',
          message: extractErrorMessage(err, 'Could not add room.'),
        })
      },
    })
  }

  const handleDownloadPdf = () => {
    generatePdf.mutate(undefined, {
      onSuccess: (result) => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}${result.url}`, '_blank')
      },
      onError: (err) => {
        showNotification({
          variant: 'danger',
          message: extractErrorMessage(err, 'Could not generate the QR code PDF.'),
        })
      },
    })
  }

  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN]}>
      <div className="container-fluid py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div>
            <h4 className="mb-1">Classrooms &amp; QR Check-In Codes</h4>
            <p className="text-muted mb-0">
              Add each physical classroom, then print its QR code to post at the door — teachers scan it to check in.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={handleDownloadPdf}
            disabled={generatePdf.isPending || !rooms?.length}
          >
            {generatePdf.isPending ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <Download size={16} />
            )}
            Download QR Codes (PDF)
          </button>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label fw-semibold">Add a room</label>
            <div className="d-flex gap-2" style={{ maxWidth: 420 }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Room 5, Science Lab"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
              />
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-1 flex-shrink-0"
                onClick={handleAddRoom}
                disabled={createRoom.isPending}
              >
                {createRoom.isPending ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <Plus size={16} />
                )}
                Add
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted">Loading rooms…</div>
        ) : !rooms?.length ? (
          <div className="text-center text-muted py-5">
            <DoorOpen size={32} className="mb-2 opacity-50" />
            <p className="mb-0">No rooms added yet.</p>
          </div>
        ) : (
          <div className="row g-3">
            {rooms.map((room) => (
              <div key={room.id} className="col-sm-6 col-lg-4 col-xl-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column align-items-center text-center p-3">
                    <div className="p-2 bg-white border rounded-3 mb-2">
                      <QRCode value={checkInUrlFor(room.id)} size={120} />
                    </div>
                    <span className="fw-semibold">{room.roomNumber}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

export default RoomsPage
