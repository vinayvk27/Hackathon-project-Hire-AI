import { useState, useEffect, useRef } from 'react'
import {
  Clock, Award, RefreshCw, FileText, X, CheckCircle2,
  XCircle, ShieldCheck, MessageSquare, Loader2, AlertCircle,
  ChevronRight, ChevronDown, FolderSearch, Brain, Send,
} from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'
import CandidateReportDashboard from '../components/CandidateReportDashboard'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  Applied:     'bg-sky-100 text-sky-600 border border-sky-200',
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

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const verdict  = report?.recommendation?.verdict
  const isHire   = verdict === 'Hire'
  const isNoHire = verdict === 'No Hire'

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/40 backdrop-blur-md p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl shadow-sky-900/20 border border-sky-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-sky-950">Interview Report</h2>
            <p className="text-sm text-sky-500">{candidateName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-400 hover:text-sky-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sky-400">
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
                    !isHire && !isNoHire && 'bg-sky-50 border-sky-200',
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {isHire   && <CheckCircle2 size={24} className="text-emerald-600" />}
                    {isNoHire && <XCircle      size={24} className="text-red-500" />}
                    {!isHire && !isNoHire && <Clock size={24} className="text-sky-400" />}
                  </div>
                  <div>
                    <p
                      className={clsx(
                        'text-lg font-bold leading-tight',
                        isHire   && 'text-emerald-700',
                        isNoHire && 'text-red-600',
                        !isHire && !isNoHire && 'text-sky-600',
                      )}
                    >
                      {verdict ?? 'Pending'}
                    </p>
                    <p className="text-sm text-sky-700/80 mt-1">
                      {report.recommendation?.reason}
                    </p>
                  </div>
                </div>
              </section>

              {/* ── AI Summary ─────────────────────────────────────────── */}
              <section>
                <SectionHeader icon={<MessageSquare size={15} />} title="AI Interview Summary" />
                <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4">
                  {report.ai_summary
                    ? <SummaryBody text={report.ai_summary} />
                    : <p className="text-sm text-sky-400 italic">No summary available.</p>
                  }
                </div>
              </section>

              {/* ── Proctoring Logs ────────────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader icon={<FileText size={15} />} title="Behavioral Analysis" inline />
                  {report.proctoring_score != null && (
                    <span className="text-xs font-semibold bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full">
                      Integrity Score: {(report.proctoring_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {report.proctoring_logs?.length > 0 ? (
                  <ul className="space-y-2">
                    {report.proctoring_logs.map((log, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-sky-700 bg-sky-50 border border-sky-100 px-3 py-2.5 rounded-lg"
                      >
                        <ChevronRight size={14} className="text-sky-400 shrink-0 mt-0.5" />
                        <span className="font-mono text-xs leading-relaxed break-all">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-sky-50/70 border border-sky-100 rounded-xl px-4 py-3">
                    <p className="text-sm text-sky-400 italic">
                      No behavioral anomalies detected during this session.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-sky-100">
          <button
            onClick={onClose}
            className="text-sky-700 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 px-5 py-2 text-sm font-medium transition-colors"
          >
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
    <div className="flex items-center gap-2 text-sky-700">
      <span className="text-sky-400">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  )
  return inline ? el : <div className="mb-2">{el}</div>
}

function SummaryBody({ text }) {
  const lines = text.split('\n').filter(Boolean)
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const clean    = line.replace(/^[•\-\*]\s*/, '')
        const isBullet = /^[•\-\*]/.test(line)
        return (
          <li key={i} className={clsx('text-sm text-sky-800 leading-relaxed', isBullet && 'flex gap-2')}>
            {isBullet && <span className="text-sky-400 mt-1 shrink-0">•</span>}
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
        <div className="w-20 h-20 rounded-2xl bg-sky-100/80 flex items-center justify-center">
          <FolderSearch size={36} className="text-sky-300" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-200 flex items-center justify-center">
          <span className="text-sky-500 text-sm font-bold leading-none">0</span>
        </div>
      </div>
      <h3 className="text-base font-semibold text-sky-600 mb-1">No candidates yet</h3>
      <p className="text-sm text-sky-400 max-w-xs leading-relaxed">
        Invite a candidate to take the assessment to see their results here.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SkeletonTable — pulsing placeholder while loading (Authorized Candidates)
// ---------------------------------------------------------------------------
const SKELETON_COLS = [140, 40, 90, 80, 80, 90, 100, 70]

function SkeletonRow() {
  return (
    <tr className="border-b border-sky-100">
      {SKELETON_COLS.map((w, i) => (
        <td key={i} className="px-5 py-4">
          {i === 0 ? (
            <div className="space-y-1.5">
              <div className="h-3.5 rounded-full bg-sky-100 animate-pulse" style={{ width: w }} />
              <div className="h-2.5 rounded-full bg-sky-50 animate-pulse" style={{ width: w * 0.6 }} />
            </div>
          ) : (
            <div
              className="h-3 rounded-full bg-sky-50 animate-pulse"
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
      <thead className="sticky top-0 z-10 bg-sky-50/95 backdrop-blur-sm border-b border-sky-200">
        <tr>
          {['Candidate', 'Job', 'Match', 'Status', 'Interview', 'Tech Score', 'Credentials', 'Action'].map((h) => (
            <th
              key={h}
              className="text-left px-5 py-3.5 text-xs font-semibold text-sky-400 uppercase tracking-wider whitespace-nowrap"
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

function aiScoreColor(value) {
  if (value >= 80) return { text: 'text-emerald-700', bar: 'bg-emerald-500', track: 'bg-emerald-100' }
  if (value >= 65) return { text: 'text-sky-700',     bar: 'bg-sky-500',     track: 'bg-sky-100'     }
  return              { text: 'text-amber-700',        bar: 'bg-amber-400',   track: 'bg-amber-100'   }
}

function ScoreBar({ value, max = 100, label, colorFn = scoreColor }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
        Pending
      </span>
    )
  }
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const { text, bar, track } = colorFn(value)
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

  // ── Unified AI-Recommended Candidates ────────────────────────────────────
  const [unified,          setUnified]          = useState(null)
  const [unifiedLoading,   setUnifiedLoading]   = useState(true)
  const [unifiedJobId,     setUnifiedJobId]     = useState(null)
  const [selected,         setSelected]         = useState(new Set())
  const [authorizing,      setAuthorizing]      = useState(false)
  const [authorizeSuccess, setAuthorizeSuccess] = useState(false)

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

  const fetchUnifiedCandidates = async () => {
    setUnifiedLoading(true)
    try {
      const jobsRes  = await api.get('/jobs/list')
      const firstJob = jobsRes.data?.[0]
      if (!firstJob) { setUnifiedLoading(false); return }
      setUnifiedJobId(firstJob.id)

      const [globalRes, benchRes] = await Promise.all([
        api.post('/api/match/global', { job_id: firstJob.id, threshold: 30, limit: 20 }),
        api.get('/api/internal/bench'),
      ])

      // Build bench map: bench-id → { name, email }
      const benchMap = {}
      for (const b of benchRes.data) {
        benchMap[b.id] = { name: b.name, email: b.email }
      }

      // Enrich internal candidates with real names/emails from bench data
      const enriched = {
        ...globalRes.data,
        matches: globalRes.data.matches.map(m => {
          if (m.source === 'internal') {
            const benchId = m.candidate_key.replace(/^internal:/, '')
            const bench   = benchMap[benchId]
            return {
              ...m,
              candidate_name:  bench?.name  ?? m.candidate_name,
              candidate_email: bench?.email ?? m.candidate_email,
            }
          }
          return m
        }),
      }

      setUnified(enriched)
    } catch (err) {
      console.error('Failed to load unified candidates:', err)
      setUnified(null)
    } finally {
      setUnifiedLoading(false)
    }
  }

  const authorizeSelected = async () => {
    setAuthorizing(true)
    setAuthorizeSuccess(false)
    try {
      const selectedMatches = (unified?.matches ?? []).filter(m => selected.has(m.candidate_key))
      await api.post('/assessment/candidates/notify', {
        candidates: selectedMatches.map(m => ({
          name:   m.candidate_name,
          email:  m.candidate_email,
          job_id: unifiedJobId,
        })),
      })
      setAuthorizeSuccess(true)
      setSelected(new Set())
      fetchCandidates()
      fetchUnifiedCandidates()
      setTimeout(() => setAuthorizeSuccess(false), 6000)
    } catch (err) {
      console.error('Authorize failed:', err)
    } finally {
      setAuthorizing(false)
    }
  }

  const toggleAll = () => {
    const matches = unified?.matches ?? []
    if (selected.size === matches.length && matches.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(matches.map(m => m.candidate_key)))
    }
  }

  const toggleRow = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  useEffect(() => {
    fetchCandidates()
    fetchUnifiedCandidates()
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

  const matches     = unified?.matches ?? []
  const allSelected = matches.length > 0 && selected.size === matches.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative font-sans">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-green-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-screen-xl mx-auto p-8 space-y-6">

        {/* Report modal */}
        {reportFor && (
          <CandidateReportDashboard
            candidateId={reportFor.id}
            candidateName={reportFor.name}
            onClose={() => setReportFor(null)}
          />
        )}

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-sky-950">Candidates</h1>
            <p className="text-sky-700/70 font-medium text-sm mt-1">Manage candidates and their assessment pipeline</p>
          </div>
          <button
            onClick={fetchCandidates}
            className="flex items-center gap-2 text-sky-700 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 shadow-sm px-4 py-2 text-sm font-medium transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',       value: candidates.length,                                          color: 'text-sky-800'     },
            { label: 'Shortlisted', value: candidates.filter(c => c.status === 'Shortlisted').length,  color: 'text-blue-700'    },
            { label: 'Assessed',    value: candidates.filter(c => c.status === 'Assessed').length,     color: 'text-green-700'   },
            { label: 'Interviewed', value: interviewedCount,                                           color: 'text-emerald-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-sky-400 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Unified AI-Recommended Candidates (Internal + External) ─────── */}
        <div className="rounded-2xl overflow-hidden border border-sky-200 shadow-sm bg-white">

          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-sky-50 to-green-50 border-b border-sky-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
                <Brain size={20} className="text-sky-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-sky-900">
                  AI-Recommended Candidates (Internal + External)
                </h2>
                <p className="text-xs text-sky-500 mt-0.5">
                  Select candidates to authorize and dispatch credentials.
                </p>
              </div>
            </div>
            <button
              onClick={fetchUnifiedCandidates}
              disabled={unifiedLoading}
              className="flex items-center gap-2 text-sky-700 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 shadow-sm px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-wait shrink-0 ml-4"
            >
              <RefreshCw size={15} className={unifiedLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-sky-100 bg-sky-50/40">
            <p className="text-sm font-medium text-sky-700">
              {selected.size} of {matches.length} selected
            </p>
            <button
              onClick={authorizeSelected}
              disabled={selected.size === 0 || authorizing}
              className={clsx(
                'flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200',
                selected.size === 0 || authorizing
                  ? 'bg-sky-100 text-sky-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 text-white shadow-md shadow-sky-500/20',
              )}
            >
              {authorizing ? (
                <><Loader2 size={15} className="animate-spin" /> Authorizing…</>
              ) : authorizeSuccess ? (
                <><CheckCircle2 size={15} /> Dispatched!</>
              ) : (
                <><Send size={15} /> Authorize &amp; Notify Selected</>
              )}
            </button>
          </div>

          {/* Body */}
          {unifiedLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sky-50/95 border-b border-sky-200">
                  <tr>
                    {['', 'Candidate', 'Source', 'AI Score', 'AI Reasoning', 'Role'].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-sky-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-sky-100">
                      <td className="px-5 py-4 w-10">
                        <div className="w-4 h-4 rounded bg-sky-100 animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="h-3.5 rounded-full bg-sky-100 animate-pulse w-32" />
                          <div className="h-2.5 rounded-full bg-sky-50 animate-pulse w-20" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 rounded-full bg-sky-50 animate-pulse w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 rounded-full bg-sky-50 animate-pulse w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 rounded-full bg-sky-50 animate-pulse w-48" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 rounded-full bg-sky-50 animate-pulse w-24" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                <Brain size={28} className="text-sky-300" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-sky-600 mb-1">No candidates scored yet</p>
              <p className="text-xs text-sky-400 max-w-sm leading-relaxed">
                Run internal matching (n8n) and upload external resumes to populate this list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-sky-50/95 backdrop-blur-sm border-b border-sky-200">
                  <tr>
                    <th className="px-5 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleAll}
                        className="w-4 h-4 text-sky-600 border-sky-300 rounded focus:ring-sky-500"
                      />
                    </th>
                    {['Candidate', 'Source', 'AI Score', 'AI Reasoning', 'Role'].map(h => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-sky-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100">
                  {matches.map((m) => {
                    const isChecked   = selected.has(m.candidate_key)
                    const reasoning   = m.llm_evaluation?.reasoning ?? m.llm_evaluation?.summary ?? ''
                    const sourceStyle = m.source === 'internal'
                      ? 'bg-sky-100 text-sky-700 border-sky-200'
                      : 'bg-green-100 text-green-700 border-green-200'
                    return (
                      <tr
                        key={m.candidate_key}
                        onClick={() => toggleRow(m.candidate_key)}
                        className={clsx(
                          'cursor-pointer transition-colors duration-100',
                          isChecked ? 'bg-sky-50/70' : 'hover:bg-sky-50/40',
                        )}
                      >
                        <td className="px-5 py-4 w-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRow(m.candidate_key)}
                            className="w-4 h-4 text-sky-600 border-sky-300 rounded focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-[14px] font-semibold text-sky-900 leading-tight">
                            {m.candidate_name || m.candidate_key}
                          </p>
                          <p className="text-xs text-sky-400 mt-0.5 font-mono">{m.candidate_email}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-bold border', sourceStyle)}>
                            {m.source === 'internal' ? 'Internal' : 'External'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <ScoreBar
                            value={m.overall_score}
                            label={`${m.overall_score.toFixed(0)}%`}
                            colorFn={aiScoreColor}
                          />
                        </td>
                        <td className="px-5 py-4 max-w-[320px]">
                          <p className="text-xs text-sky-600 leading-relaxed line-clamp-3">{reasoning}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 px-2.5 py-1 rounded-full">
                            {unified.job_title}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Authorize Success Toast ──────────────────────────────────────── */}
        {authorizeSuccess && (
          <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white border border-emerald-200 text-sky-900 px-5 py-4 rounded-2xl shadow-2xl shadow-sky-900/10 max-w-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-900">Credentials dispatched</p>
              <p className="text-xs text-sky-500 mt-0.5 leading-relaxed">
                Assessment invitations sent to selected candidates. They will appear in the pipeline below.
              </p>
            </div>
          </div>
        )}

        {/* ── Authorized Candidates table ──────────────────────────────────── */}
        <div className="card overflow-x-auto">
          {loading ? (
            <SkeletonTable />
          ) : candidates.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-sky-50/95 backdrop-blur-sm border-b border-sky-200">
                <tr>
                  {['Candidate', 'Job', 'Match', 'Status', 'Interview', 'Tech Score', 'Credentials', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-xs font-semibold text-sky-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
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
                        isExpanded ? 'bg-sky-50/60' : 'hover:bg-sky-50/50',
                      )}
                    >
                      {/* Name + Email stacked */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[15px] font-bold text-sky-900 leading-tight">{c.name}</p>
                        <p className="text-xs text-sky-400 mt-0.5 truncate max-w-[200px]">{c.email}</p>
                        {c.reasoning_summary && (
                          <p className="text-xs text-sky-400 mt-1 max-w-[220px] truncate italic">
                            {c.reasoning_summary}
                          </p>
                        )}
                      </td>

                      {/* Job */}
                      <td className="px-5 py-4 text-sky-500">#{c.job_id}</td>

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
                          <span className="text-sky-200 text-xs">—</span>
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
                            <span className="font-mono text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded select-all">
                              {c.username}
                            </span>
                            {c.password && (
                              <span className="font-mono text-xs text-slate-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded select-all">
                                {c.password}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sky-200">—</span>
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
                              className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
                            >
                              {actionId === c.id ? 'Saving…' : 'Shortlist →'}
                            </button>
                          )}

                          {/* Awaiting test */}
                          {c.status === 'Shortlisted' && !isComplete && (
                            <span className="text-xs text-sky-400 flex items-center gap-1">
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
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors"
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
                                  ? 'bg-sky-100 border-sky-300 text-sky-700'
                                  : 'bg-white border-sky-200 text-sky-500 hover:bg-sky-50',
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
                      <tr key={`${c.id}-details`} className="bg-sky-50/50 border-b border-sky-100">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="space-y-4 max-w-4xl">
                            {/* Reasoning summary */}
                            {c.reasoning_summary && (
                              <div>
                                <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-2">
                                  Reasoning Summary
                                </p>
                                <p className="text-sm text-sky-800 leading-relaxed bg-white border border-sky-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
                                  {c.reasoning_summary}
                                </p>
                              </div>
                            )}

                            {/* Interview logs */}
                            {c.interview_logs?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-2">
                                  Interview Logs
                                </p>
                                <ul className="space-y-1.5">
                                  {c.interview_logs.map((log, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2.5 text-xs text-sky-700 bg-white border border-sky-100 px-3 py-2 rounded-lg font-mono leading-relaxed"
                                    >
                                      <ChevronRight size={12} className="text-sky-400 shrink-0 mt-0.5" />
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
    </div>
  )
}
