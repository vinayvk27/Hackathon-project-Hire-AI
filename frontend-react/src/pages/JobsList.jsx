import { useState, useEffect } from 'react'
import { Briefcase, Download, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { jsPDF } from 'jspdf'
import api from '../api/client'

// ── helpers ──────────────────────────────────────────────────────────────────

function parseSkills(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return raw.split(',').map(s => s.trim()).filter(Boolean) }
  }
  return []
}

function levelBadgeClass(level) {
  const l = (level || '').toLowerCase()
  if (l.includes('senior') || l.includes('lead')) return 'bg-violet-50 text-violet-700 border-violet-200'
  if (l.includes('mid'))                            return 'bg-sky-50 text-sky-700 border-sky-200'
  if (l.includes('junior') || l.includes('entry')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

// ── PDF export ────────────────────────────────────────────────────────────────

function downloadJobPDF(job) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const PAGE_W   = doc.internal.pageSize.getWidth()
  const MARGIN   = 48
  const CONTENT_W = PAGE_W - MARGIN * 2
  let y = MARGIN

  const addPageIfNeeded = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  const writeLine = (text, opts = {}) => {
    const { size = 11, bold = false, color = [30, 41, 59], indent = 0 } = opts
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CONTENT_W - indent)
    lines.forEach(line => {
      addPageIfNeeded(size * 1.6)
      doc.text(line, MARGIN + indent, y)
      y += size * 1.6
    })
  }

  const writeSection = (label) => {
    y += 14
    addPageIfNeeded(30)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(99, 102, 241)
    doc.text(label.toUpperCase(), MARGIN, y)
    y += 4
    doc.setDrawColor(199, 210, 254)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    y += 12
  }

  // Header band
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, PAGE_W, 72, 'F')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(job.title || 'Job Description', MARGIN, 38)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Job ID: ${job.id}   •   Hire AI`, MARGIN, 58)
  y = 90

  // Experience level
  if (job.experience_level) {
    writeSection('Experience Level')
    writeLine(job.experience_level, { size: 12, bold: true, color: [79, 70, 229] })
    y += 4
  }

  // Description
  const description = (job.description || '').trim()
  if (description) {
    writeSection('Job Description')
    // Render section headings (lines ending with :) as bold, rest as normal
    const paragraphs = description.split('\n')
    paragraphs.forEach(para => {
      const trimmed = para.trimEnd()
      if (!trimmed) { y += 6; return }
      const isHeading = trimmed.endsWith(':') && trimmed.length < 80
      writeLine(trimmed, { size: isHeading ? 11 : 10.5, bold: isHeading, color: isHeading ? [30, 41, 59] : [71, 85, 105] })
    })
  }

  // Required skills
  const skills = parseSkills(job.required_skills)
  if (skills.length) {
    writeSection('Required Skills')
    const cols = 2
    const colW = CONTENT_W / cols
    skills.forEach((skill, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      if (col === 0) addPageIfNeeded(18)
      const x = MARGIN + col * colW
      const lineY = y + row * 18
      doc.setFillColor(238, 242, 255)
      doc.roundedRect(x, lineY - 11, colW - 8, 16, 3, 3, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(67, 56, 202)
      doc.text(`• ${skill}`, x + 8, lineY)
    })
    y += Math.ceil(skills.length / cols) * 18 + 8
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(`Hire AI  •  Confidential`, MARGIN, doc.internal.pageSize.getHeight() - 20)
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN - 40, doc.internal.pageSize.getHeight() - 20)
  }

  const filename = `${(job.title || 'job').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_jd.pdf`
  doc.save(filename)
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job }) {
  const [expanded, setExpanded] = useState(false)
  const skills = parseSkills(job.required_skills)
  const SKILL_PREVIEW = 5

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900 truncate">{job.title}</h3>
            <span className="text-xs text-slate-400 font-mono">#{job.id}</span>
          </div>
          {job.experience_level && (
            <span className={`mt-1.5 inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${levelBadgeClass(job.experience_level)}`}>
              {job.experience_level}
            </span>
          )}
        </div>

        <button
          onClick={() => downloadJobPDF(job)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all"
        >
          <Download size={13} />
          PDF
        </button>
      </div>

      {/* Skills row */}
      {skills.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {(expanded ? skills : skills.slice(0, SKILL_PREVIEW)).map((skill, i) => (
            <span
              key={i}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full"
            >
              {skill}
            </span>
          ))}
          {!expanded && skills.length > SKILL_PREVIEW && (
            <span className="text-xs text-slate-400 px-1 self-center">
              +{skills.length - SKILL_PREVIEW} more
            </span>
          )}
        </div>
      )}

      {/* Expand / collapse description */}
      {job.description && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 py-2.5 border-t border-slate-100 transition-colors"
          >
            {expanded ? <><ChevronUp size={13} /> Hide description</> : <><ChevronDown size={13} /> View description</>}
          </button>
          {expanded && (
            <div className="px-5 pb-5">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
                {job.description}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsList() {
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [query,   setQuery]   = useState('')

  useEffect(() => {
    api.get('/jobs/list')
      .then(r => setJobs(r.data))
      .catch(() => setError('Failed to load jobs. Make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    (j.experience_level || '').toLowerCase().includes(query.toLowerCase()) ||
    parseSkills(j.required_skills).some(s => s.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase size={20} className="text-sky-500" />
          <h1 className="text-xl font-bold text-slate-900">Saved Job Descriptions</h1>
        </div>
        <p className="text-sm text-slate-500">
          {jobs.length} JD{jobs.length !== 1 ? 's' : ''} saved — click <strong>PDF</strong> on any card to export.
        </p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, level, or skill…"
          className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-sm"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={28} className="animate-spin mr-3" />
          <span className="text-sm">Loading jobs…</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-24 text-slate-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{query ? 'No jobs match your search.' : 'No jobs saved yet. Create one in JD Generator.'}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}
