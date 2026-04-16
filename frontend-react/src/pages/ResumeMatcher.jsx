import { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Upload, Search, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, KeyRound } from 'lucide-react'
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
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 w-5">#{rank}</span>
          {icon}
          <div>
            <p className="font-semibold text-slate-800">{ev.candidate_name || match.source}</p>
            <p className="text-xs text-slate-400">{match.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {match.username && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <KeyRound size={13} className="text-slate-400 shrink-0" />
              <div className="text-xs">
                <span className="font-mono text-slate-700 select-all">{match.username}</span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded select-all">{match.plain_password}</span>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-slate-400">Vector</p>
            <p className="text-sm font-semibold text-slate-600">
              {(match.vector_score * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">LLM Score</p>
            <ScoreBadge score={score} />
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {ev.summary && (
        <div className="px-5 pb-3">
          <p className="text-sm text-slate-600 italic">{ev.summary}</p>
        </div>
      )}

      {/* Alignment metrics */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 border-t border-slate-100">
        {[
          ['Experience', alignment.experience_score],
          ['Skills',     alignment.skill_score],
          ['Culture Fit',alignment.cultural_potential],
        ].map(([label, val]) => (
          <div key={label} className="bg-white px-4 py-3 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-base font-bold text-slate-700">{val ?? 0}<span className="text-xs font-normal text-slate-400">/100</span></p>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Green flags */}
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Green Flags</p>
              <ul className="space-y-1">
                {(ev.green_flags || []).map((f, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-green-500 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            {/* Red flags */}
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Red Flags</p>
              <ul className="space-y-1">
                {(ev.red_flags || []).map((f, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-red-500 shrink-0">✗</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {ev.technical_depth_critique && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Technical Depth</p>
              <p className="text-xs text-slate-600">{ev.technical_depth_critique}</p>
            </div>
          )}

          {ev.missing_required_skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {ev.missing_required_skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Resume Snippet</p>
            <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded p-2">{match.snippet}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResumeMatcher() {
  // Persisted across tab switches via Layout context
  const { matcherJobId: jobId, setMatcherJobId: setJobId,
          matcherResults: results, setMatcherResults: setResults,
          matcherUploaded: uploadDone, setMatcherUploaded: setUploadDone,
        } = useOutletContext()

  // Transient UI state — fine to reset on navigation
  const [files, setFiles]             = useState([])
  const [uploading, setUploading]     = useState(false)
  const [matching, setMatching]       = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [availableJobs, setAvailableJobs] = useState([])
  const inputRef = useRef()

  useEffect(() => {
    api.get('/jobs/list')
      .then((res) => setAvailableJobs(res.data))
      .catch(() => {/* silently ignore — user can still type */})
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

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resume Matcher</h1>
        <p className="text-slate-500 text-sm mt-1">Upload resumes and match them against a Job Description</p>
      </div>

      {/* Upload section */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Step 1 — Upload Resumes</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'
          )}
        >
          <Upload size={28} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-600">Drag & drop PDFs here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">PDF files only</p>
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
              <li key={f.name} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-slate-700">{f.name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                  className="text-slate-400 hover:text-red-500 transition-colors text-xs"
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
          className="btn-primary"
          onClick={uploadResumes}
          disabled={!files.length || uploading}
        >
          {uploading ? 'Processing...' : `Upload & Process ${files.length > 0 ? `(${files.length})` : ''}`}
        </button>
      </div>

      {/* Match section */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Step 2 — Find Best Matches</h2>
        <div className="flex gap-3">
          <select
            className="input max-w-xs"
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
            className="btn-primary flex items-center gap-2"
            onClick={findMatches}
            disabled={!jobId || matching}
          >
            <Search size={16} />
            {matching ? 'Matching...' : 'Find Best Matches'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{results.job_title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Domain: <span className="font-medium text-brand-600">{results.domain}</span>
                {' · '}{results.matches?.length} candidates evaluated
              </p>
            </div>
          </div>

          {results.matches?.length === 0 && (
            <p className="text-sm text-slate-500">No matches found. Try uploading resumes first.</p>
          )}

          <div className="space-y-3">
            {results.matches?.map((match, i) => (
              <CandidateCard key={match.source} match={match} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
