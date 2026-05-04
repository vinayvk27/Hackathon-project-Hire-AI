import { useState, useEffect } from 'react'
import {
  BarChart2, RefreshCw, Briefcase, Users, CheckCircle2,
  Activity, Award, TrendingUp, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'

const STAGE_COLORS = {
  applied:      '#38bdf8',
  shortlisted:  '#3b82f6',
  assessed:     '#8b5cf6',
  interviewing: '#f59e0b',
  completed:    '#10b981',
  rejected:     '#f87171',
}

const STAGE_LABELS = {
  applied:      'Applied',
  shortlisted:  'Shortlisted',
  assessed:     'Assessed',
  interviewing: 'Interviewing',
  completed:    'Completed',
  rejected:     'Rejected',
}

const STAGES = ['applied', 'shortlisted', 'assessed', 'interviewing', 'completed', 'rejected']

function ScorePill({ value }) {
  if (!value) return <span className="text-sky-200 text-xs">—</span>
  const color = value >= 80
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : value >= 60
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-600 border-red-200'
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
      {value.toFixed(1)}
    </span>
  )
}

export default function PipelineDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/pipeline/stats')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load pipeline data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  // Guard: render loading/error shell until data.summary is available.
  // Keeps kpis + chartData below from running before the fetch resolves.
  if (loading || !data?.summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-32 w-96 h-96 bg-green-200/40 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-screen-xl mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-sky-950">Pipeline Dashboard</h1>
              <p className="text-sky-700/70 font-medium text-sm mt-1">Real-time hiring funnel across all open roles</p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 text-sky-700 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 shadow-sm px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <div className="flex items-center justify-center py-24 text-sky-400 gap-3">
            {loading ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm font-medium">Loading pipeline stats…</span>
              </>
            ) : (
              <p className="text-sm text-sky-500">No data available.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // data.summary is guaranteed from this point — safe to destructure
  const kpis = [
    { label: 'Open Roles',  value: data.summary.total_jobs,        icon: Briefcase,    color: 'text-sky-600',     bg: 'bg-sky-100'     },
    { label: 'Candidates',  value: data.summary.total_candidates,  icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-100'    },
    { label: 'Shortlisted', value: data.summary.total_shortlisted, icon: TrendingUp,   color: 'text-indigo-600',  bg: 'bg-indigo-100'  },
    { label: 'Assessed',    value: data.summary.total_assessed,    icon: Award,        color: 'text-purple-600',  bg: 'bg-purple-100'  },
    { label: 'Interviewed', value: data.summary.total_interviewed, icon: Activity,     color: 'text-amber-600',   bg: 'bg-amber-100'   },
    { label: 'Completed',   value: data.summary.total_completed,   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ]

  const chartData = data.jobs.map(job => ({
    name: job.title.length > 22 ? job.title.slice(0, 22) + '…' : job.title,
    ...job.stages,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative font-sans">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-green-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-screen-xl mx-auto p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-sky-950">Pipeline Dashboard</h1>
            <p className="text-sky-700/70 font-medium text-sm mt-1">Real-time hiring funnel across all open roles</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 text-sky-700 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 shadow-sm px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-4 text-center"
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={20} className={color} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-sky-400 font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Stacked Bar Chart */}
            {chartData.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-6">
                <h2 className="text-base font-bold text-sky-950 mb-1">Candidates per Role by Stage</h2>
                <p className="text-xs text-sky-400 mb-5">Stacked distribution across all open positions</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e0f2fe', fontSize: '12px' }}
                      formatter={(value, name) => [value, STAGE_LABELS[name] ?? name]}
                    />
                    <Legend
                      formatter={(value) => STAGE_LABELS[value] ?? value}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    {STAGES.map(stage => (
                      <Bar key={stage} dataKey={stage} stackId="a" fill={STAGE_COLORS[stage]} name={stage} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-role breakdown table */}
            {data.jobs.length > 0 ? (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-sky-50/95 backdrop-blur-sm border-b border-sky-200">
                    <tr>
                      {['Role', 'Level', 'Skills', 'Total', 'Applied', 'Shortlisted', 'Assessed', 'Interviewing', 'Completed', 'Rejected', 'Avg Match', 'Avg Tech'].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-3.5 text-xs font-semibold text-sky-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {data.jobs.map(job => (
                      <tr key={job.job_id} className="hover:bg-sky-50/50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-[14px] font-bold text-sky-900 leading-tight">{job.title}</p>
                          <p className="text-xs text-sky-400 mt-0.5">#{job.job_id}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs text-sky-600 font-medium bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                            {job.experience_level || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 max-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {(job.required_skills || []).slice(0, 3).map((skill, i) => (
                              <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                                {skill}
                              </span>
                            ))}
                            {(job.required_skills?.length ?? 0) > 3 && (
                              <span className="text-[10px] text-sky-400">+{job.required_skills.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sky-700 font-semibold">{job.total_candidates}</td>

                        {STAGES.map(stage => (
                          <td key={stage} className="px-4 py-4">
                            {job.stages[stage] > 0 ? (
                              <span
                                className="inline-flex items-center justify-center min-w-[28px] text-xs font-bold px-2.5 py-1 rounded-full text-white"
                                style={{ backgroundColor: STAGE_COLORS[stage] }}
                              >
                                {job.stages[stage]}
                              </span>
                            ) : (
                              <span className="text-sky-200 text-xs">—</span>
                            )}
                          </td>
                        ))}

                        <td className="px-4 py-4"><ScorePill value={job.avg_match_score} /></td>
                        <td className="px-4 py-4"><ScorePill value={job.avg_tech_score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white/90 rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-12 text-center">
                <BarChart2 size={36} className="text-sky-200 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sky-600 font-semibold text-sm">No roles found</p>
                <p className="text-sky-400 text-xs mt-1">Create job descriptions to see pipeline data here.</p>
              </div>
            )}
        </>
      </div>
    </div>
  )
}
