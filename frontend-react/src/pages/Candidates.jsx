import { useState, useEffect, useRef } from 'react'
import {
  Clock, Award, RefreshCw, FileText, X, CheckCircle2,
  XCircle, ShieldCheck, MessageSquare, Loader2, AlertCircle,
  ChevronRight,
} from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  Applied:     'bg-slate-100 text-slate-600',
  Shortlisted: 'bg-blue-100 text-blue-700',
  Assessed:    'bg-green-100 text-green-700',
  Rejected:    'bg-red-100 text-red-600',
}

const INTERVIEW_STATUS_STYLES = {
  Pending_Screening: null,                               // don't render anything
  Screening_Done:    'bg-amber-100 text-amber-700',
  Interview_Complete:'bg-emerald-100 text-emerald-700',
}

const INTERVIEW_STATUS_LABELS = {
  Pending_Screening:  null,
  Screening_Done:     'HR Done',
  Interview_Complete: 'Complete',
}

// ---------------------------------------------------------------------------
// InterviewReportModal
// ---------------------------------------------------------------------------

function InterviewReportModal({ candidateId, candidateName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [report, setReport]   = useState(null)
  const [error, setError]     = useState('')
  const overlayRef = useRef(null)

  useEffect(() => {
    api.get(`/interview/report/${candidateId}`)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load report.'))
      .finally(() => setLoading(false))
  }, [candidateId])

  // Close on backdrop click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const verdict = report?.recommendation?.verdict   // "Hire" | "No Hire" | "Pending"
  const isHire  = verdict === 'Hire'
  const isNoHire = verdict === 'No Hire'

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Interview Report</h2>
            <p className="text-sm text-slate-500">{candidateName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Generating report…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && report && (
            <>
              {/* ── Final Recommendation ───────────────────────────────── */}
              <section>
                <SectionHeader icon={<ShieldCheck size={15} />} title="Final Recommendation" />
                <div
                  className={clsx(
                    'flex items-start gap-4 p-4 rounded-xl border',
                    isHire   && 'bg-emerald-50 border-emerald-200',
                    isNoHire && 'bg-red-50 border-red-200',
                    !isHire && !isNoHire && 'bg-slate-50 border-slate-200',
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {isHire   && <CheckCircle2 size={24} className="text-emerald-600" />}
                    {isNoHire && <XCircle      size={24} className="text-red-500" />}
                    {!isHire && !isNoHire && <Clock size={24} className="text-slate-400" />}
                  </div>
                  <div>
                    <p
                      className={clsx(
                        'text-lg font-bold leading-tight',
                        isHire   && 'text-emerald-700',
                        isNoHire && 'text-red-600',
                        !isHire && !isNoHire && 'text-slate-600',
                      )}
                    >
                      {verdict ?? 'Pending'}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {report.recommendation?.reason}
                    </p>
                  </div>
                </div>
              </section>

              {/* ── AI Summary ─────────────────────────────────────────── */}
              <section>
                <SectionHeader icon={<MessageSquare size={15} />} title="AI Interview Summary" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  {report.ai_summary
                    ? <SummaryBody text={report.ai_summary} />
                    : <p className="text-sm text-slate-400 italic">No summary available.</p>
                  }
                </div>
              </section>

              {/* ── Proctoring Logs ────────────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader icon={<FileText size={15} />} title="Behavioral Analysis" inline />
                  {report.proctoring_score != null && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      Integrity Score: {(report.proctoring_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {report.proctoring_logs?.length > 0 ? (
                  <ul className="space-y-2">
                    {report.proctoring_logs.map((log, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg"
                      >
                        <ChevronRight size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-mono text-xs leading-relaxed break-all">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-slate-400 italic">
                      No behavioral anomalies detected during this session.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary px-5">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Small helpers used inside the modal
function SectionHeader({ icon, title, inline = false }) {
  const el = (
    <div className="flex items-center gap-2 text-slate-700">
      <span className="text-slate-400">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  )
  return inline ? el : <div className="mb-2">{el}</div>
}

function SummaryBody({ text }) {
  // Render bullet-list summaries (lines starting with •, -, or *) nicely
  const lines = text.split('\n').filter(Boolean)
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const clean = line.replace(/^[\u2022\-\*]\s*/, '')
        const isBullet = /^[\u2022\-\*]/.test(line)
        return (
          <li key={i} className={clsx('text-sm text-slate-700 leading-relaxed', isBullet && 'flex gap-2')}>
            {isBullet && <span className="text-slate-400 mt-1 shrink-0">•</span>}
            {clean}
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Main Candidates page
// ---------------------------------------------------------------------------

export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [actionId,   setActionId]   = useState(null)
  const [reportFor,  setReportFor]  = useState(null)   // { id, name }

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await api.get('/assessment/candidates/list')
      setCandidates(res.data)
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCandidates() }, [])

  const shortlist = async (id) => {
    setActionId(id)
    try {
      await api.post('/assessment/candidates/shortlist', { candidate_id: id })
      fetchCandidates()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to shortlist.')
    } finally {
      setActionId(null)
    }
  }

  const interviewedCount = candidates.filter(
    (c) => c.interview_status === 'Interview_Complete'
  ).length

  return (
    <div className="p-8 space-y-6">
      {/* Report modal */}
      {reportFor && (
        <InterviewReportModal
          candidateId={reportFor.id}
          candidateName={reportFor.name}
          onClose={() => setReportFor(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500 text-sm mt-1">Manage candidates and their assessment pipeline</p>
        </div>
        <button onClick={fetchCandidates} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: candidates.length,                                          color: 'text-slate-800' },
          { label: 'Shortlisted', value: candidates.filter(c => c.status === 'Shortlisted').length,  color: 'text-blue-700'  },
          { label: 'Assessed',    value: candidates.filter(c => c.status === 'Assessed').length,     color: 'text-green-700' },
          { label: 'Interviewed', value: interviewedCount,                                           color: 'text-emerald-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading candidates…</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No candidates yet. Run the resume matcher to register candidates.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Email', 'Job', 'Match', 'Status', 'Interview', 'Tech Score', 'Credentials', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map((c) => {
                const interviewStyle = INTERVIEW_STATUS_STYLES[c.interview_status]
                const interviewLabel = INTERVIEW_STATUS_LABELS[c.interview_status]
                const isComplete     = c.interview_status === 'Interview_Complete'

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{c.name}</td>

                    {/* Email */}
                    <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{c.email}</td>

                    {/* Job */}
                    <td className="px-4 py-3 text-slate-500">#{c.job_id}</td>

                    {/* Match */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {c.match_score?.toFixed(1)}%
                    </td>

                    {/* Pipeline status */}
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          STATUS_STYLES[c.status] || STATUS_STYLES.Applied,
                        )}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Interview status */}
                    <td className="px-4 py-3">
                      {interviewStyle ? (
                        <span
                          className={clsx(
                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                            interviewStyle,
                          )}
                        >
                          {interviewLabel}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Tech score */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.technical_score != null ? (
                        <span className="font-semibold text-slate-800">
                          {c.technical_score}
                          <span className="text-slate-400 font-normal">/100</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Credentials */}
                    <td className="px-4 py-3">
                      {c.username ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded select-all">
                            {c.username}
                          </span>
                          {c.password && (
                            <span className="font-mono text-xs text-slate-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded select-all">
                              {c.password}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Shortlist button */}
                        {c.status === 'Applied' && (
                          <button
                            onClick={() => shortlist(c.id)}
                            disabled={actionId === c.id}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            {actionId === c.id ? 'Saving…' : 'Shortlist →'}
                          </button>
                        )}

                        {/* Awaiting test */}
                        {c.status === 'Shortlisted' && !isComplete && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> Awaiting test
                          </span>
                        )}

                        {/* Assessed — no interview yet */}
                        {c.status === 'Assessed' && !isComplete && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Award size={12} /> Assessed
                          </span>
                        )}

                        {/* View Report — interview complete */}
                        {isComplete && (
                          <button
                            onClick={() => setReportFor({ id: c.id, name: c.name })}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText size={12} />
                            View Report
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
