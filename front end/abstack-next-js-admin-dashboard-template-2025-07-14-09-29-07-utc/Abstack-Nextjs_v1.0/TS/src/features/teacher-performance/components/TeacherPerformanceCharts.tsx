'use client'
import dynamic from 'next/dynamic'
import { CalendarCheck, ClipboardCheck, BookOpenCheck, AlertTriangle } from 'lucide-react'
import type { TeacherPerformanceDto } from '../types'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  })
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div
        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        {icon}
      </div>
      <div>
        <span className="fw-semibold small d-block">{title}</span>
        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{subtitle}</span>
      </div>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex flex-column align-items-center px-3 py-2 rounded-3 bg-light">
      <span className="fw-bold">{value}</span>
      <span className="text-muted" style={{ fontSize: '0.7rem' }}>{label}</span>
    </div>
  )
}

interface TeacherPerformanceChartsProps {
  data: TeacherPerformanceDto
  behindScheduleOutlier?: boolean
}

export default function TeacherPerformanceCharts({ data, behindScheduleOutlier }: TeacherPerformanceChartsProps) {
  const { attendance, classResults, syllabus } = data

  return (
    <>
      {behindScheduleOutlier && (
        <div className="alert d-flex align-items-center gap-2 border-0 bg-warning bg-opacity-15 text-warning-emphasis mb-4">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="small">
            Syllabus coverage has been behind schedule for 2 or more consecutive months.
          </span>
        </div>
      )}

      {/* Attendance & Punctuality */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <SectionHeader
              icon={<CalendarCheck size={18} className="text-white" />}
              title="Attendance & Punctuality"
              subtitle="Monthly present rate and on-time rate"
            />
            <div className="d-flex gap-2">
              <StatPill label="Days marked" value={String(attendance.overall.totalMarkedDays)} />
              <StatPill label="Present rate" value={`${attendance.overall.presentRate.toFixed(1)}%`} />
              <StatPill label="Punctuality" value={`${attendance.overall.punctualityRate.toFixed(1)}%`} />
            </div>
          </div>

          {attendance.monthly.length === 0 ? (
            <p className="text-muted small mb-0">No attendance records yet.</p>
          ) : (
            <Chart
              type="line"
              height={240}
              series={[
                { name: 'Present rate %', data: attendance.monthly.map((m) => Math.round(m.presentRate * 10) / 10) },
                { name: 'Punctuality rate %', data: attendance.monthly.map((m) => Math.round(m.punctualityRate * 10) / 10) },
              ]}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: attendance.monthly.map((m) => formatMonth(m.month)) },
                yaxis: { min: 0, max: 100, title: { text: 'Rate %' } },
                stroke: { curve: 'smooth', width: 3 },
                colors: ['#6366f1', '#22c55e'],
                markers: { size: 4 },
                dataLabels: { enabled: false },
                legend: { position: 'top' },
              }}
            />
          )}
        </div>
      </div>

      {/* Class Results */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <SectionHeader
            icon={<ClipboardCheck size={18} className="text-white" />}
            title="Class Results"
            subtitle="Pass rate and average mark per class/subject taught"
          />

          {classResults.length === 0 ? (
            <p className="text-muted small mb-0">Not yet assigned to teach any subject/class.</p>
          ) : (
            <>
              <Chart
                type="bar"
                height={260}
                series={[
                  { name: 'Pass rate %', data: classResults.map((r) => Math.round(r.passRate * 10) / 10) },
                  { name: 'Average mark %', data: classResults.map((r) => Math.round(r.averageMarkPercent * 10) / 10) },
                ]}
                options={{
                  chart: { toolbar: { show: false } },
                  plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
                  xaxis: {
                    categories: classResults.map((r) => `${r.subjectName} · ${r.classSectionName}`),
                  },
                  yaxis: { min: 0, max: 100, title: { text: '%' } },
                  colors: ['#22c55e', '#6366f1'],
                  dataLabels: { enabled: false },
                  legend: { position: 'top' },
                }}
              />

              <div className="table-responsive mt-3">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Subject / Class</th>
                      <th className="text-center">Assessments</th>
                      <th className="text-center">Submitted Marks</th>
                      <th className="text-center">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classResults.map((r) => (
                      <tr key={`${r.subjectId}-${r.classSectionId}`}>
                        <td className="small">
                          {r.subjectName} · {r.classSectionName}
                          {r.isPassRateOutlier && (
                            <span className="badge d-inline-flex align-items-center gap-1 bg-danger bg-opacity-15 text-danger ms-2">
                              <AlertTriangle size={11} />
                              Outlier
                            </span>
                          )}
                        </td>
                        <td className="text-center small">{r.assessmentsCount}</td>
                        <td className="text-center small">{r.submittedMarksCount}</td>
                        <td className="text-center small">
                          {r.passRate.toFixed(1)}%
                          {r.isPassRateOutlier && r.priorYearAveragePassRate !== null && (
                            <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
                              (prior year: {r.priorYearAveragePassRate.toFixed(1)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Syllabus Completion */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <SectionHeader
              icon={<BookOpenCheck size={18} className="text-white" />}
              title="Syllabus Completion"
              subtitle="Lessons completed vs. planned, per subject"
            />
            <span className="badge bg-secondary bg-opacity-15 text-secondary">
              Overall: {syllabus.overallCompletionPercent.toFixed(1)}%
            </span>
          </div>

          {syllabus.bySubject.length === 0 ? (
            <p className="text-muted small mb-0">No syllabus plan entries yet.</p>
          ) : (
            <Chart
              type="bar"
              height={Math.max(160, syllabus.bySubject.length * 60)}
              series={[{ name: 'Completion %', data: syllabus.bySubject.map((s) => Math.round(s.completionPercent * 10) / 10) }]}
              options={{
                chart: { toolbar: { show: false } },
                plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
                xaxis: { categories: syllabus.bySubject.map((s) => s.subjectName), min: 0, max: 100 },
                colors: ['#f59e0b'],
                dataLabels: { enabled: true, formatter: (v: number) => `${v}%` },
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}
