import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, Loader2, Users, Info } from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

const SOURCES = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    btnClass: 'bg-[#0077B5] hover:bg-[#006396]',
    textClass: 'text-[#0077B5]',
    borderClass: 'border-[#0077B5]/25',
    bgClass: 'bg-[#0077B5]/5',
    badgeClass: 'bg-[#0077B5]/10 text-[#0077B5] border-[#0077B5]/20',
  },
  {
    key: 'naukri',
    label: 'Naukri',
    btnClass: 'bg-orange-500 hover:bg-orange-600',
    textClass: 'text-orange-600',
    borderClass: 'border-orange-200',
    bgClass: 'bg-orange-50',
    badgeClass: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  {
    key: 'indeed',
    label: 'Indeed',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700',
    textClass: 'text-indigo-600',
    borderClass: 'border-indigo-200',
    bgClass: 'bg-indigo-50',
    badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  {
    key: 'referrals',
    label: 'Referrals',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'internals',
    label: 'Internals',
    btnClass: 'bg-sky-700 hover:bg-sky-800',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    bgClass: 'bg-sky-50',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
]

function UploadZone({ source, count, onUploadSuccess }) {
  const [files, setFiles]       = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast]       = useState(null)
  const inputRef = useRef()

  const handleFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf')
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...pdfs.filter(f => !names.has(f.name))]
    })
  }

  const upload = async () => {
    if (!files.length) return
    setUploading(true)
    setToast(null)
    try {
      const formData = new FormData()
      formData.append('source', source.key)
      files.forEach(f => formData.append('files', f))
      const res = await api.post('/pool/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const n = res.data.uploaded?.length ?? 0
      setToast({
        ok: true,
        text: `${n} resume${n !== 1 ? 's' : ''} added to ${source.label} pool. Matching against open JDs in background…`,
      })
      setFiles([])
      onUploadSuccess()
    } catch {
      setToast({ ok: false, text: 'Upload failed. Please try again.' })
    } finally {
      setUploading(false)
      setTimeout(() => setToast(null), 6000)
    }
  }

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col',
      source.borderClass,
    )}>
      {/* Zone header */}
      <div className={clsx('px-4 py-3 border-b flex items-center justify-between', source.bgClass, source.borderClass)}>
        <span className={clsx('font-bold text-sm', source.textClass)}>{source.label}</span>
        <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1', source.badgeClass)}>
          <Users size={10} />
          {count ?? 0}
        </span>
      </div>

      {/* Drop area + file list + button */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-200 hover:border-sky-400 hover:bg-sky-50/50',
          )}
        >
          <Upload size={20} className="mx-auto text-sky-400 mb-1" />
          <p className="text-xs font-medium text-slate-500">Drop PDFs or click to select</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-1 max-h-28 overflow-y-auto">
            {files.map(f => (
              <li key={f.name} className="flex items-center justify-between text-xs bg-sky-50 border border-sky-100 rounded-lg px-3 py-1.5">
                <span className="text-sky-800 font-medium truncate">{f.name}</span>
                <button
                  onClick={() => setFiles(prev => prev.filter(x => x.name !== f.name))}
                  className="text-sky-300 hover:text-red-500 ml-2 shrink-0 transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {toast && (
          <div className={clsx(
            'flex items-start gap-2 text-xs px-3 py-2 rounded-lg border',
            toast.ok
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200',
          )}>
            {toast.ok && <CheckCircle size={12} className="shrink-0 mt-0.5" />}
            <span>{toast.text}</span>
          </div>
        )}

        <button
          onClick={upload}
          disabled={!files.length || uploading}
          className={clsx(
            'mt-auto w-full py-2 text-white text-xs font-bold rounded-xl transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5',
            source.btnClass,
          )}
        >
          {uploading
            ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
            : `Upload to ${source.label}${files.length ? ` (${files.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

export default function ResumeMatcher() {
  const [stats, setStats] = useState({})

  const fetchStats = () => {
    api.get('/pool/stats').then(r => setStats(r.data)).catch(() => {})
  }

  useEffect(() => { fetchStats() }, [])

  const totalResumes = SOURCES.reduce((sum, s) => sum + (stats[s.key] ?? 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-green-300/30 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-sky-950">Talent Pool</h1>
            <p className="text-sky-700/70 font-medium text-sm mt-1">
              Upload resumes to each source pool — AI matching against open JDs runs automatically in the background.
            </p>
          </div>
          {totalResumes > 0 && (
            <span className="text-sm font-semibold text-sky-700 bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-full">
              {totalResumes} total resumes
            </span>
          )}
        </div>

        {/* 5-zone grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {SOURCES.map(source => (
            <UploadZone
              key={source.key}
              source={source}
              count={stats[source.key]}
              onUploadSuccess={fetchStats}
            />
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-sky-100 px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-sky-400 shrink-0" />
            <span className="font-semibold text-sky-900 text-sm">How it works</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-sky-700/80">
            <div className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p>Upload PDF resumes to any of the five source pools above.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p>Each resume is vector-embedded and scored against every <strong>Open</strong> JD using two-stage AI matching (≥70% vector similarity → LLM evaluation).</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p>View matched candidates grouped by source on each Job Description in <strong>Saved JDs</strong>.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
