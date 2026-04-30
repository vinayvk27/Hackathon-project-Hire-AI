import { useState, useEffect, useRef } from 'react'
import {
  Clock, Award, RefreshCw, FileText, X, CheckCircle2,
  XCircle, ShieldCheck, MessageSquare, Loader2, AlertCircle,
  ChevronRight, ChevronDown, FolderSearch, Brain, Send,
  UserCheck, Sparkles,
} from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  Applied:     'bg-slate-100 text-slate-600 border border-slate-200',
  Shortlisted: 'bg-blue-100 text-blue-700 border border-blue-200',
  Assessed:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Hired:       'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Rejected:    'bg-red-100 text-red-600 border border-red-200',
}

const INTERVIEW_STATUS_STYLES = {
  Pending_Screening:  null,
  Screening_Done:     'bg-amber-100 text-amber-700 border border-amber-200',
  Tech_Done:          'bg-orange-100 text-orange-700 border border-orange-200',
  Assessed:           'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Interview_Complete: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

const INTERVIEW_STATUS_LABELS = {
  Pending_Screening:  null,
  Screening_Done:     'HR Done',
  Tech_Done:          'Tech Done',
  Assessed:           'Assessed',
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
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FolderSearch size={36} className="text-slate-300" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
          <span className="text-slate-400 text-sm font-bold leading-none">0</span>
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-500 mb-1">No candidates yet</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        Invite a candidate to take the assessment to see their results here.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SkeletonTable — pulsing placeholder while loading
// ---------------------------------------------------------------------------
const SKELETON_COLS = [140, 40, 90, 80, 80, 90, 100, 70]

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {SKELETON_COLS.map((w, i) => (
        <td key={i} className="px-5 py-4">
          {i === 0 ? (
            <div className="space-y-1.5">
              <div className="h-3.5 rounded-full bg-slate-200 animate-pulse" style={{ width: w }} />
              <div className="h-2.5 rounded-full bg-slate-100 animate-pulse" style={{ width: w * 0.6 }} />
            </div>
          ) : (
            <div
              className="h-3 rounded-full bg-slate-100 animate-pulse"
              style={{ width: w, animationDelay: `${i * 60}ms` }}
            />
          )}
        </td>
      ))}
    </tr>
  )
}

function SkeletonTable() {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <tr>
          {['Candidate', 'Job', 'Match', 'Status', 'Interview', 'Tech Score', 'Credentials', 'Action'].map((h) => (
            <th
              key={h}
              className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// ScoreBar — mini progress bar with color thresholds
// ---------------------------------------------------------------------------
function scoreColor(value) {
  if (value >= 80) return { text: 'text-emerald-700', bar: 'bg-emerald-500', track: 'bg-emerald-100' }
  if (value >= 60) return { text: 'text-amber-700',   bar: 'bg-amber-400',   track: 'bg-amber-100'   }
  return              { text: 'text-red-600',          bar: 'bg-red-400',     track: 'bg-red-100'     }
}

function ScoreBar({ value, max = 100, label }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        Pending
      </span>
    )
  }
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const { text, bar, track } = scoreColor(value)
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <span className={`text-sm font-bold leading-none ${text}`}>
        {label ?? `${value.toFixed(1)}%`}
      </span>
      <div className={`h-1.5 w-full rounded-full ${track}`}>
        <div
          className={`h-full rounded-full ${bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Candidates page
// ---------------------------------------------------------------------------

export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [actionId,   setActionId]   = useState(null)
  const [reportFor,  setReportFor]  = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // ── Internal Candidates ──────────────────────────────────────────────────
  const [internalCandidates, setInternalCandidates] = useState([])
  const [internalLoading,    setInternalLoading]    = useState(true)
  const [notifyLoading,      setNotifyLoading]      = useState(false)
  const [notifySuccess,      setNotifySuccess]      = useState(false)

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

  const fetchInternalRecommendations = async () => {
    setInternalLoading(true)
    try {
      const jobsRes  = await api.get('/jobs/list')
      const firstJob = jobsRes.data?.[0]
      if (!firstJob) { setInternalLoading(false); return }

      const [matchRes, benchRes] = await Promise.all([
        api.post('/api/internal/match', { job_id: firstJob.id }),
        api.get('/api/internal/bench'),
      ])

      const benchMap = Object.fromEntries(benchRes.data.map(b => [b.name, b]))
      const merged   = matchRes.data.map(m => ({
        name:      m.name,
        email:     benchMap[m.name]?.email ?? '',
        score:     m.score,
        reasoning: m.reasoning,
        job_id:    firstJob.id,
        job_title: firstJob.title,
      }))
      setInternalCandidates(merged)
    } catch (err) {
      console.error('Failed to load internal recommendations:', err)
      setInternalCandidates([])
    } finally {
      setInternalLoading(false)
    }
  }

  const authorizeAndNotify = async () => {
    setNotifyLoading(true)
    setNotifySuccess(false)
    try {
      await api.post('/assessment/candidates/notify', {
        candidates: internalCandidates.map(c => ({
          name:   c.name,
          email:  c.email,
          job_id: c.job_id,
        })),
      })
      setNotifySuccess(true)
      fetchCandidates()
      setTimeout(() => setNotifySuccess(false), 6000)
    } catch (err) {
      console.error('Notify failed:', err)
    } finally {
      setNotifyLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
    fetchInternalRecommendations()
  }, [])

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

      {/* ── AI Recommended Internal Candidates ─────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">

        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0">
              <Brain size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                AI Recommended Internal Candidates
                <span className="inline-flex items-center gap-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <Sparkles size={9} /> AI Match
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bench talent identified by the orchestration pipeline — authorize to generate credentials &amp; dispatch invitations
              </p>
            </div>
          </div>

          {internalCandidates.length > 0 && (
            <button
              onClick={authorizeAndNotify}
              disabled={notifyLoading || notifySuccess}
              className={clsx(
                'flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shrink-0 ml-4',
                notifySuccess
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 disabled:opacity-60 disabled:cursor-wait',
              )}
            >
              {notifyLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating credentials and dispatching secure emails…
                </>
              ) : notifySuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  Invitations Dispatched
                </>
              ) : (
                <>
                  <Send size={15} />
                  Authorize &amp; Notify Candidates
                </>
              )}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="bg-white">
          {internalLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Running AI match analysis…</span>
            </div>
          ) : internalCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <UserCheck size={32} className="mb-3 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">No job found to match against</p>
              <p className="text-xs text-slate-400 mt-1">Create a job description first, then return here</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  {['Candidate', 'AI Score', 'AI Reasoning', 'Role'].map(h => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {internalCandidates.map((c, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    {/* Name + email */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[14px] font-bold text-slate-800 leading-tight">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.email}</p>
                    </td>

                    {/* AI Score */}
                    <td className="px-6 py-4">
                      <ScoreBar value={c.score} label={`${c.score}%`} />
                    </td>

                    {/* Reasoning */}
                    <td className="px-6 py-4 max-w-[380px]">
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {c.reasoning}
                      </p>
                    </td>

                    {/* Job title */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">
                        {c.job_title}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Success Toast ────────────────────────────────────────────────────── */}
      {notifySuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-slate-900 border border-emerald-500/30 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-black/30 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Credentials dispatched</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Assessment invitations sent to all authorised internal candidates. They will appear in the pipeline below.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <SkeletonTable />
        ) : candidates.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
              <tr>
                {['Candidate', 'Job', 'Match', 'Status', 'Interview', 'Tech Score', 'Credentials', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((c) => {
                const interviewStyle = INTERVIEW_STATUS_STYLES[c.interview_status]
                const interviewLabel = INTERVIEW_STATUS_LABELS[c.interview_status]
                const isComplete     = c.interview_status === 'Interview_Complete'
                const isExpanded     = expandedId === c.id
                const toggleExpand   = () => setExpandedId(isExpanded ? null : c.id)
                const hasDetails     = c.reasoning_summary || c.interview_logs?.length

                return (
                  <>
                  <tr
                    key={c.id}
                    className={clsx(
                      'transition-colors duration-100 group',
                      isExpanded ? 'bg-blue-50/60' : 'hover:bg-blue-50/40',
                    )}
                  >
                    {/* Name + Email stacked */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-[15px] font-bold text-slate-800 leading-tight">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{c.email}</p>
                      {c.reasoning_summary && (
                        <p className="text-xs text-slate-400 mt-1 max-w-[220px] truncate italic">
                          {c.reasoning_summary}
                        </p>
                      )}
                    </td>

                    {/* Job */}
                    <td className="px-5 py-4 text-slate-500">#{c.job_id}</td>

                    {/* Match */}
                    <td className="px-5 py-4">
                      <ScoreBar value={c.match_score} />
                    </td>

                    {/* Pipeline status */}
                    <td className="px-5 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
                          STATUS_STYLES[c.status] || STATUS_STYLES.Applied,
                        )}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Interview status */}
                    <td className="px-5 py-4">
                      {interviewStyle ? (
                        <span
                          className={clsx(
                            'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
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
                    <td className="px-5 py-4">
                      <ScoreBar
                        value={c.technical_score}
                        max={100}
                        label={c.technical_score != null ? `${c.technical_score}/100` : null}
                      />
                    </td>

                    {/* Credentials */}
                    <td className="px-5 py-4">
                      {c.username ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded select-all">
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
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
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

                        {/* Expand toggle — shown when there's detail data */}
                        {hasDetails && (
                          <button
                            onClick={toggleExpand}
                            className={clsx(
                              'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
                              isExpanded
                                ? 'bg-slate-100 border-slate-300 text-slate-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                            )}
                          >
                            <ChevronDown
                              size={12}
                              className={clsx('transition-transform duration-200', isExpanded && 'rotate-180')}
                            />
                            {isExpanded ? 'Collapse' : 'Details'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable details row */}
                  {isExpanded && hasDetails && (
                    <tr key={`${c.id}-details`} className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={8} className="px-6 py-5">
                        <div className="space-y-4 max-w-4xl">
                          {/* Reasoning summary */}
                          {c.reasoning_summary && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Reasoning Summary
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl px-4 py-3 whitespace-pre-wrap">
                                {c.reasoning_summary}
                              </p>
                            </div>
                          )}

                          {/* Interview logs */}
                          {c.interview_logs?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Interview Logs
                              </p>
                              <ul className="space-y-1.5">
                                {c.interview_logs.map((log, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg font-mono leading-relaxed"
                                  >
                                    <ChevronRight size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                    {log}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
