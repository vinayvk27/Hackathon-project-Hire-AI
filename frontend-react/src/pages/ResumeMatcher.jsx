import { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Upload, Search, ChevronDown, ChevronUp, CheckCircle, XCircle,
  AlertCircle, KeyRound, Globe, Loader2, Sparkles,
} from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

function ScoreBadge({ score }) {
  const color =
    score >= 85 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 70 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    score >= 50 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-lg font-bold px-3 py-1 rounded-full border ${color}`}>
      {score}/100
    </span>
  )
}

function CandidateCard({ match, rank }) {
  const [open, setOpen] = useState(false)
  const ev = match.llm_evaluation || {}
  const score = ev.overall_score ?? 0
  const alignment = ev.alignment_metrics || {}

  const icon =
    score >= 85 ? <CheckCircle size={18} className="text-green-500" /> :
    score >= 50 ? <AlertCircle size={18} className="text-yellow-500" /> :
                  <XCircle size={18} className="text-red-500" />

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-sky-400 w-5">#{rank}</span>
          {icon}
          <div>
            <p className="font-semibold text-sky-900">{ev.candidate_name || match.source}</p>
            <p className="text-xs text-sky-400">{match.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {match.username && (
            <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5">
              <KeyRound size={13} className="text-sky-400 shrink-0" />
              <div className="text-xs">
                <span className="font-mono text-sky-800 select-all">{match.username}</span>
                <span className="text-sky-300 mx-1">/</span>
                <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded select-all">{match.plain_password}</span>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-sky-400">Vector</p>
            <p className="text-sm font-semibold text-sky-600">
              {(match.vector_score * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-sky-400">LLM Score</p>
            <ScoreBadge score={score} />
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-400 transition-colors"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {ev.summary && (
        <div className="px-5 pb-3">
          <p className="text-sm text-sky-700/80 italic">{ev.summary}</p>
        </div>
      )}

      {/* Alignment metrics */}
      <div className="grid grid-cols-3 gap-px bg-sky-100/50 border-t border-sky-100">
        {[
          ['Experience', alignment.experience_score],
          ['Skills',     alignment.skill_score],
          ['Culture Fit',alignment.cultural_potential],
        ].map(([label, val]) => (
          <div key={label} className="bg-white/80 px-4 py-3 text-center">
            <p className="text-xs text-sky-400 mb-1">{label}</p>
            <p className="text-base font-bold text-sky-800">{val ?? 0}<span className="text-xs font-normal text-sky-400">/100</span></p>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-sky-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Green Flags</p>
              <ul className="space-y-1">
                {(ev.green_flags || []).map((f, i) => (
                  <li key={i} className="text-xs text-sky-700 flex gap-1.5">
                    <span className="text-green-500 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Red Flags</p>
              <ul className="space-y-1">
                {(ev.red_flags || []).map((f, i) => (
                  <li key={i} className="text-xs text-sky-700 flex gap-1.5">
                    <span className="text-red-500 shrink-0">✗</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {ev.technical_depth_critique && (
            <div>
              <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1">Technical Depth</p>
              <p className="text-xs text-sky-700">{ev.technical_depth_critique}</p>
            </div>
          )}

          {ev.missing_required_skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {ev.missing_required_skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1">Resume Snippet</p>
            <p className="text-xs text-sky-700 font-mono bg-sky-50 rounded-lg p-2">{match.snippet}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResumeMatcher() {
  const { matcherJobId: jobId, setMatcherJobId: setJobId,
          matcherResults: results, setMatcherResults: setResults,
          matcherUploaded: uploadDone, setMatcherUploaded: setUploadDone,
        } = useOutletContext()

  const [files, setFiles]             = useState([])
  const [uploading, setUploading]     = useState(false)
  const [matching, setMatching]       = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [availableJobs, setAvailableJobs] = useState([])

  const [externalCandidates, setExternalCandidates] = useState([])
  const [externalLoading,    setExternalLoading]    = useState(null)
  const [externalError,      setExternalError]      = useState('')
  const [externalSource,     setExternalSource]     = useState(null)

  const inputRef = useRef()

  useEffect(() => {
    api.get('/jobs/list')
      .then((res) => setAvailableJobs(res.data))
      .catch(() => {})
  }, [])

  const handleFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === 'application/pdf')
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...pdfs.filter((f) => !names.has(f.name))]
    })
    setUploadDone(false)
  }

  const uploadResumes = async () => {
    if (!files.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      await api.post('/candidates/upload-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadDone(true)
    } catch {
      alert('Upload failed. Make sure the backend is running.')
    } finally {
      setUploading(false)
    }
  }

  const findMatches = async () => {
    if (!jobId.trim()) return
    setMatching(true)
    setResults(null)
    try {
      const res = await api.get(`/candidates/match/${jobId}`)
      setResults(res.data)
    } catch {
      alert('Matching failed. Check the Job ID.')
    } finally {
      setMatching(false)
    }
  }

  const fetchExternalCandidates = async (source) => {
    if (!jobId) {
      setExternalError('Select a job in Step 1 before sourcing external candidates.')
      return
    }
    setExternalLoading(source)
    setExternalError('')
    setExternalCandidates([])
    setExternalSource(source)
    try {
      const res = await api.post(`/api/external/match?source=${source}&job_id=${jobId}`)
      if (res.data.length === 0) {
        setExternalError(`No candidates found on ${source}.`)
      } else {
        setExternalCandidates(res.data)
      }
    } catch {
      setExternalError(`Couldn't reach ${source} — please try again.`)
    } finally {
      setExternalLoading(null)
    }
  }

  const jobSelected = !!jobId

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative overflow-hidden font-sans">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-green-300/30 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto p-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-sky-950">Resume Matcher</h1>
          <p className="text-sky-700/70 font-medium text-sm mt-1">Source candidates and match them against a Job Description</p>
        </div>

        {/* ── Step 1 — Select a Job ── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-sky-900">Step 1 — Select a Job</h2>
            <p className="text-xs text-sky-400 mt-1">Choose the job description to match candidates against</p>
          </div>
          <div className="flex gap-3">
            <select
              className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-gray-900 font-medium text-sm max-w-xs flex-1"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Select a job…</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} (ID: {job.id})
                </option>
              ))}
            </select>
            <button
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 text-white font-bold rounded-xl shadow-md shadow-sky-500/25 transition-all disabled:opacity-60 transform hover:-translate-y-0.5"
              onClick={findMatches}
              disabled={!jobId || matching}
            >
              <Search size={16} />
              {matching ? 'Matching...' : 'Find Best Matches'}
            </button>
          </div>
        </div>

        {/* ── Step 2 — Source Candidates ── */}
        <div className={clsx(
          'bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-6 space-y-6 transition-opacity duration-300',
          !jobSelected && 'opacity-60'
        )}>
          <div>
            <h2 className="font-semibold text-sky-900">Step 2 — Source Candidates</h2>
            <p className="text-xs text-sky-400 mt-1">
              {jobSelected
                ? 'Upload resumes manually or pull from ATS integrations — both are scored by the same AI pipeline'
                : 'Select a job in Step 1 to enable candidate sourcing'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* ── Pathway A: Manual Upload ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-green-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none">A</span>
                <span className="text-sm font-semibold text-sky-900">Manual Resume Upload</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); if (jobSelected) setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (jobSelected) handleFiles(e.dataTransfer.files) }}
                onClick={() => { if (jobSelected) inputRef.current.click() }}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  jobSelected ? 'cursor-pointer' : 'cursor-not-allowed',
                  dragOver
                    ? 'border-sky-500 bg-sky-50'
                    : jobSelected
                      ? 'border-slate-200 hover:border-sky-400 hover:bg-sky-50/50'
                      : 'border-slate-200'
                )}
              >
                <Upload size={28} className="mx-auto text-sky-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">Drag & drop PDFs here or click to browse</p>
                <p className="text-xs text-sky-400 mt-1">PDF files only</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((f) => (
                    <li key={f.name} className="flex items-center justify-between text-sm bg-sky-50/70 border border-sky-100 rounded-xl px-3 py-2">
                      <span className="text-sky-800 font-medium">{f.name}</span>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                        className="text-sky-400 hover:text-red-500 transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {uploadDone && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle size={16} /> {files.length} resume{files.length > 1 ? 's' : ''} processed successfully
                </div>
              )}

              <button
                className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 text-white font-bold rounded-xl shadow-md shadow-sky-500/25 transition-all disabled:opacity-60 transform hover:-translate-y-0.5"
                onClick={uploadResumes}
                disabled={!files.length || uploading || !jobSelected}
              >
                {uploading ? 'Processing...' : `Upload & Process ${files.length > 0 ? `(${files.length})` : ''}`}
              </button>
            </div>

            {/* ── Pathway B: ATS 1-Click Sourcing ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none">B</span>
                <span className="text-sm font-semibold text-sky-900">1-Click ATS Sourcing</span>
              </div>

              <div className="rounded-xl border border-sky-200/80 overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-gradient-to-r from-sky-950 to-sky-800">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-sky-300 shrink-0" />
                    <span className="text-sm font-semibold text-white">External Talent Sources</span>
                    <span className="inline-flex items-center gap-1 bg-sky-400/20 border border-sky-300/30 text-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Sparkles size={9} /> Simulated ATS
                    </span>
                  </div>
                  <p className="text-xs text-sky-300/70 mt-1.5">
                    Pull candidates from job portals — select a job in Step 1 first, then click a source below
                  </p>
                </div>

                <div className="p-5 space-y-3 bg-gradient-to-br from-sky-50/60 to-white">
                  <div className="flex flex-col gap-2.5">
                    {[
                      { source: 'linkedin', label: 'LinkedIn', accent: 'bg-[#0077B5] hover:bg-[#006396] shadow-blue-900/30'    },
                      { source: 'naukri',  label: 'Naukri',   accent: 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30' },
                      { source: 'indeed',  label: 'Indeed',   accent: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30' },
                    ].map(({ source, label, accent }) => (
                      <button
                        key={source}
                        onClick={() => fetchExternalCandidates(source)}
                        disabled={externalLoading !== null || !jobSelected}
                        className={clsx(
                          'flex items-center justify-center gap-2.5 w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
                          accent,
                        )}
                      >
                        {externalLoading === source ? (
                          <><Loader2 size={15} className="animate-spin" /> Scanning {label}…</>
                        ) : (
                          <><Globe size={15} /> Browse from {label}</>
                        )}
                      </button>
                    ))}
                  </div>

                  {externalError && (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs px-3 py-2.5 rounded-lg">
                      <AlertCircle size={13} className="shrink-0 text-sky-400" />
                      {externalError}
                    </div>
                  )}

                  {!externalError && externalCandidates.length === 0 && externalLoading === null && (
                    <p className="text-xs text-sky-400 text-center pt-1">
                      LinkedIn · Naukri · Indeed — all scored by the same AI engine
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Manual Match Results ── */}
        {results && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-sky-900">{results.job_title}</h2>
              <p className="text-xs text-sky-400 mt-0.5">
                Domain: <span className="font-medium text-sky-600">{results.domain}</span>
                {' · '}{results.matches?.length} candidates evaluated
              </p>
            </div>

            {results.matches?.length === 0 && (
              <p className="text-sm text-sky-700/80">No matches found. Try uploading resumes first.</p>
            )}

            <div className="space-y-3">
              {results.matches?.map((match, i) => (
                <CandidateCard key={match.source} match={match} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── External ATS Results ── */}
        {externalCandidates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-sky-500" />
              <div>
                <h2 className="font-semibold text-sky-900">
                  External Candidates —{' '}
                  <span className={clsx(
                    'capitalize font-bold',
                    externalSource === 'linkedin' && 'text-[#0077B5]',
                    externalSource === 'naukri'   && 'text-orange-500',
                    externalSource === 'indeed'   && 'text-indigo-600',
                  )}>
                    {externalSource}
                  </span>
                </h2>
                <p className="text-xs text-sky-400 mt-0.5">
                  {externalCandidates.length} candidate{externalCandidates.length !== 1 ? 's' : ''} scored by AI — review before authorizing to the pipeline
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-sky-200/80 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-sky-50/95 border-b border-sky-200">
                  <tr>
                    {['Candidate', 'AI Score', 'Reasoning', 'Role', 'Source'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-sky-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 bg-white">
                  {externalCandidates.map((c, i) => (
                    <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[14px] font-bold text-sky-900 leading-tight">{c.name}</p>
                        <p className="text-xs text-sky-400 mt-0.5 font-mono">{c.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ScoreBadge score={c.score} />
                      </td>
                      <td className="px-5 py-4 max-w-[320px]">
                        <p className="text-xs text-sky-700/80 leading-relaxed line-clamp-3">{c.reasoning}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 px-2.5 py-1 rounded-full">
                          {c.job_title}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={clsx(
                          'inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border capitalize',
                          c.source === 'linkedin' && 'bg-blue-50 text-blue-600 border-blue-200',
                          c.source === 'naukri'   && 'bg-orange-50 text-orange-600 border-orange-200',
                          c.source === 'indeed'   && 'bg-indigo-50 text-indigo-600 border-indigo-200',
                        )}>
                          {c.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
