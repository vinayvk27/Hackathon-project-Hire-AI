import { useState, useEffect, useRef } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  X, Loader2, AlertCircle, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, ShieldCheck,
  FileText, TrendingUp, MessageSquare, Target,
} from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score, max = 100) {
  const pct = (score / max) * 100
  if (pct >= 80) return '#10b981' // emerald-500
  if (pct >= 60) return '#f59e0b' // amber-500
  return '#ef4444'                // red-400
}

// ---------------------------------------------------------------------------
// InsightPanel — "View Insights" toggle per widget
// ---------------------------------------------------------------------------

function InsightPanel({ insights }) {
  const [open, setOpen] = useState(false)
  if (!insights) return null
  return (
    <div className="mt-3 border-t border-sky-100 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-sky-500 hover:text-sky-700 transition-colors"
      >
        <ChevronDown size={13} className={clsx('transition-transform duration-200', open && 'rotate-180')} />
        {open ? 'Hide Insights' : 'View Insights'}
      </button>
      {open && (
        <p className="mt-2 text-xs text-sky-700 leading-relaxed bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
          {insights}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget wrapper
// ---------------------------------------------------------------------------

function Widget({ title, icon, children, insights }) {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sky-400">{icon}</span>
        <span className="text-sm font-semibold text-sky-800">{title}</span>
      </div>
      {children}
      <InsightPanel insights={insights} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget 1: Donut — Resume Match
// ---------------------------------------------------------------------------

function ResumeMatchWidget({ data }) {
  const score = data?.score ?? 0
  const color = scoreColor(score)

  return (
    <Widget title="Resume Match" icon={<FileText size={15} />} insights={data?.insights}>
      <div className="relative flex items-center justify-center" style={{ height: 144 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ value: score }, { value: Math.max(0, 100 - score) }]}
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="74%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e0f2fe" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold" style={{ color }}>
            {score.toFixed(0)}%
          </span>
          <span className="text-[10px] text-sky-400 font-medium">Match</span>
        </div>
      </div>
    </Widget>
  )
}

// ---------------------------------------------------------------------------
// Widget 2: Horizontal Bar — Assessment Categories
// ---------------------------------------------------------------------------

function AssessmentWidget({ data }) {
  const cats = data?.categories ?? []
  const chartData = cats.map((c) => ({ name: c.name, score: c.score }))

  return (
    <Widget title="Assessment Categories" icon={<TrendingUp size={15} />} insights={data?.insights}>
      <div style={{ height: 148 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 12, top: 2, bottom: 2 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#7dd3fc' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={116}
              tick={{ fontSize: 10, fill: '#0369a1' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v}/100`, 'Score']}
              contentStyle={{ fontSize: 11, borderColor: '#bae6fd', borderRadius: 8 }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={scoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  )
}

// ---------------------------------------------------------------------------
// Widget 3: Radar — Interview Q&A
// ---------------------------------------------------------------------------

function InterviewWidget({ data }) {
  const qs = data?.questions ?? []
  const radarData = qs.map((q) => ({
    subject: q.q.length > 22 ? q.q.slice(0, 21) + '…' : q.q,
    score: q.score,
    fullMark: 10,
  }))

  return (
    <Widget title="Interview Q&A" icon={<MessageSquare size={15} />} insights={data?.insights}>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
            <PolarGrid stroke="#e0f2fe" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#0369a1' }} />
            <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 8, fill: '#7dd3fc' }} tickCount={3} />
            <Radar name="Score" dataKey="score" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.22} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  )
}

// ---------------------------------------------------------------------------
// Widget 4: Overall Score ring + Verdict
// ---------------------------------------------------------------------------

function OverallWidget({ overallScore, recommendation }) {
  const score  = overallScore ?? 0
  const color  = scoreColor(score)
  const verdict  = recommendation?.verdict
  const isHire   = verdict === 'Hire'
  const isNoHire = verdict === 'No Hire'

  return (
    <Widget title="Overall Evaluation" icon={<Target size={15} />}>
      <div className="relative flex items-center justify-center" style={{ height: 116 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ value: score }, { value: Math.max(0, 100 - score) }]}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="70%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e0f2fe" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold" style={{ color }}>
            {score.toFixed(1)}
          </span>
          <span className="text-[9px] text-sky-400 font-medium">/ 100</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-2">
        {isHire && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={13} /> Hire
          </span>
        )}
        {isNoHire && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <XCircle size={13} /> No Hire
          </span>
        )}
        {!isHire && !isNoHire && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-500 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-full">
            <Clock size={13} /> {verdict ?? 'Pending'}
          </span>
        )}
        {recommendation?.reason && (
          <p className="text-xs text-sky-600/80 text-center leading-relaxed">
            {recommendation.reason}
          </p>
        )}
      </div>
    </Widget>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CandidateReportDashboard({ candidateId, candidateName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [report,  setReport]  = useState(null)
  const [error,   setError]   = useState('')
  const overlayRef = useRef(null)

  useEffect(() => {
    api.get(`/interview/report/${candidateId}`)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load report.'))
      .finally(() => setLoading(false))
  }, [candidateId])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const db   = report?.dashboard
  const logs = report?.proctoring_logs ?? []

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/40 backdrop-blur-md p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl shadow-sky-900/20 border border-sky-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-sky-950">Interview Report Dashboard</h2>
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-sky-400">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Building dashboard…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Dashboard */}
          {!loading && report && (
            <>
              {/* 4-widget grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ResumeMatchWidget data={db?.resume_match} />
                <AssessmentWidget  data={db?.assessment} />
                <InterviewWidget   data={db?.interview_performance} />
                <OverallWidget
                  overallScore={db?.overall_score}
                  recommendation={report?.recommendation}
                />
              </div>

              {/* Behavioral Logs */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} className="text-sky-400" />
                  <span className="text-sm font-semibold text-sky-700">Behavioral Analysis</span>
                  {report?.proctoring_score != null && (
                    <span className="ml-auto text-xs font-semibold bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full">
                      Integrity: {(report.proctoring_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {logs.length > 0 ? (
                  <ul className="space-y-1.5">
                    {logs.map((log, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-sky-700 bg-sky-50 border border-sky-100 px-3 py-2.5 rounded-lg font-mono leading-relaxed"
                      >
                        <ChevronRight size={12} className="text-sky-400 shrink-0 mt-0.5" />
                        {log}
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
              </div>
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
