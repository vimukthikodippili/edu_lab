'use client'
import type { Student } from '../types'

interface Props {
  student: Student
}

export function StudentIdCard({ student }: Props) {
  const fullName = `${student.firstName} ${student.lastName}`

  return (
    <div
      className="card border-0 shadow-sm"
      style={{
        maxWidth: 340,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        color: '#fff',
        borderRadius: 16,
      }}
    >
      {/* Header */}
      <div className="card-header border-0 d-flex align-items-center gap-2 px-4 pt-4 pb-0"
        style={{ background: 'transparent' }}>
        <div
          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}
        >
          <i className="pi pi-graduation-cap" style={{ fontSize: 16 }} />
        </div>
        <div>
          <div className="fw-bold" style={{ fontSize: 13, letterSpacing: 1 }}>SIMS</div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>Student Identity Card</div>
        </div>
      </div>

      <div className="card-body px-4 py-3">
        {/* Student name and admission number */}
        <div className="mb-3">
          <div className="fw-bold fs-6">{fullName}</div>
          <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'monospace' }}>
            {student.admissionNumber}
          </div>
        </div>

        {/* Grade / Section / Year */}
        <div className="d-flex gap-3 mb-4">
          <div>
            <div style={{ fontSize: 10, opacity: 0.55, textTransform: 'uppercase' }}>Grade</div>
            <div className="fw-semibold" style={{ fontSize: 13 }}>{student.grade.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.55, textTransform: 'uppercase' }}>Section</div>
            <div className="fw-semibold" style={{ fontSize: 13 }}>{student.classSection.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.55, textTransform: 'uppercase' }}>Year</div>
            <div className="fw-semibold" style={{ fontSize: 13 }}>{student.academicYear}</div>
          </div>
        </div>

        {/* QR code */}
        {student.qrCode ? (
          <div className="text-center">
            <div
              className="d-inline-block rounded-2 p-2"
              style={{ background: '#fff' }}
            >
              {/* qrCode is a base64 data URL */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={student.qrCode}
                alt={`QR code for ${fullName}`}
                width={120}
                height={120}
              />
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
              Scan to verify identity
            </div>
          </div>
        ) : (
          <div className="text-center opacity-50" style={{ fontSize: 12 }}>
            QR code not available
          </div>
        )}
      </div>
    </div>
  )
}
