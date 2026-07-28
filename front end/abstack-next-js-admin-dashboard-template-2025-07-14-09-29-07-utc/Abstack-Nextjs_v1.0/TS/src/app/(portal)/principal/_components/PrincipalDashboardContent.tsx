'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  UserCheck,
  DollarSign,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react'
import { usePrincipalKpi } from '@/features/principal/hooks/usePrincipalKpi'
import type { PrincipalKpi } from '@/types/sims/principal'

interface StatCard {
  label: string
  sub: string
  value: string | number
  icon: React.ElementType
  color: string
  href: string
}

function buildStats(kpi: PrincipalKpi): StatCard[] {
  return [
    {
      label: 'Attendance Today',
      value: kpi.attendanceHasData ? `${kpi.attendanceRate}%` : 'N/A',
      sub: kpi.attendanceHasData ? 'of students present today' : 'Not yet marked today',
      icon: UserCheck,
      color: '#10b981',
      href: '/admin/attendance',
    },
    {
      label: 'Fee Collection',
      value: `${kpi.feeCollectionRate}%`,
      sub: 'of all invoices paid',
      icon: DollarSign,
      color: '#667eea',
      href: '/accounts',
    },
    {
      label: 'Pending Approvals',
      value: kpi.pendingApprovals,
      sub: 'fee waiver requests',
      icon: ClipboardList,
      color: '#f59e0b',
      href: '/principal/approvals',
    },
    {
      label: 'Active Alerts',
      value: kpi.activeAlerts,
      sub: 'emergency alerts (7 days)',
      icon: AlertTriangle,
      color: '#ef4444',
      href: '/principal/emergency-alert',
    },
    // FR-MHA-34/AC #92-93 — the label IS the AC's exact required wording, not a short paraphrase,
    // since the AC frames this specific phrasing as the whole non-diagnostic point.
    {
      label: 'Students with elevated wellbeing concern — see counselor for detail',
      value: kpi.wellbeingConcernCount,
      sub: 'non-diagnostic count only',
      icon: HeartPulse,
      color: '#8b5cf6',
      href: '/principal/wellbeing-concerns',
    },
    // FR-MHA-34/AC #95 — links to the existing Safety Alerts feed (MHA-133), not a new page.
    {
      label: 'Safety Alerts',
      value: kpi.safetyAlertCount,
      sub: 'students with an unresolved safety flag',
      icon: ShieldAlert,
      color: '#dc2626',
      href: '/principal/safety-alerts',
    },
  ]
}

function SkeletonCards() {
  return (
    <div className="row g-3 mb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body d-flex align-items-center gap-3 py-3 placeholder-glow">
              <div
                className="rounded-3 flex-shrink-0 placeholder"
                style={{ width: 44, height: 44 }}
              />
              <div className="flex-grow-1">
                <div className="placeholder col-6 mb-1 rounded" style={{ height: 20 }} />
                <div className="placeholder col-10 rounded" style={{ height: 14 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PrincipalDashboardContent() {
  const { data, isLoading, isError } = usePrincipalKpi()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (data) setLastUpdated(new Date())
  }, [data])

  const stats = data ? buildStats(data) : []

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          <LayoutDashboard size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Principal Dashboard</h4>
          <p className="mb-0 text-muted small">
            Live school-wide KPIs — click any card to drill into the underlying records
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && <SkeletonCards />}

      {/* Error */}
      {isError && (
        <div
          className="alert d-flex align-items-center gap-3 rounded-4 border-0 mb-4"
          style={{ background: '#fff1f2', borderLeft: '4px solid #ef4444' }}
        >
          <AlertTriangle size={18} color="#ef4444" className="flex-shrink-0" />
          <span className="small">Failed to load dashboard data. The server may be unavailable.</span>
        </div>
      )}

      {/* KPI cards */}
      {!isLoading && !isError && data && (
        <div className="row g-3 mb-3">
          {stats.map((s) => (
            <div key={s.label} className="col-12 col-sm-6 col-xl-3">
              <Link href={s.href} className="text-decoration-none">
                <div
                  className="card border-0 shadow-sm rounded-4 h-100"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow =
                      '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                  }}
                >
                  <div className="card-body d-flex align-items-center gap-3 py-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 44, height: 44, background: `${s.color}20` }}
                    >
                      <s.icon size={20} color={s.color} />
                    </div>
                    <div>
                      <div className="fw-bold fs-5" style={{ color: s.color }}>
                        {s.value}
                      </div>
                      <div className="fw-semibold small">{s.label}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {s.sub}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Refresh indicator */}
      <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.72rem' }}>
        <RefreshCw size={11} />
        <span>Auto-refreshes every 30 s</span>
        {lastUpdated && (
          <span className="ms-1">· Last updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  )
}
