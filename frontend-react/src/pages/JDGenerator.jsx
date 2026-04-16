import { useState } from 'react'
import { CheckCircle, ChevronRight, Volume2, Loader, Upload, Sparkles } from 'lucide-react'
import AudioRecorder from '../components/AudioRecorder'
import api from '../api/client'
import clsx from 'clsx'

const steps = ['Role Intent', 'Answer Questions', 'Review & Save']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1
        const done    = idx < current
        const active  = idx === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  done   && 'bg-green-500 text-white',
                  active && 'bg-brand-600 text-white',
                  !done && !active && 'bg-slate-200 text-slate-500'
                )}
              >
                {done ? <CheckCircle size={16} /> : idx}
              </div>
              <span className={clsx('text-sm font-medium', active ? 'text-slate-800' : 'text-slate-400')}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={16} className="text-slate-300 mx-3" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Step 1 ─────────────────────────────────────────── */
function Step1({ intent, setIntent, onNext, loading }) {
  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">What role do you need?</h2>
      <p className="text-sm text-slate-500 mb-4">
        Describe it in one line. We'll ask the right follow-up questions.
      </p>
      <textarea
        className="input resize-none h-24"
        placeholder="e.g. Senior React developer with 3+ years for a fintech product"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
      />
      <button
        className="btn-primary mt-4"
        onClick={onNext}
        disabled={!intent.trim() || loading}
      >
        {loading ? 'Generating questions...' : 'Get Questions →'}
      </button>
    </div>
  )
}

/* ── Step 2 ─────────────────────────────────────────── */
function Step2({ questions, answers, setAnswers, onNext, loading }) {
  const [ttsLoading, setTtsLoading] = useState(null)

  const setVoice = (i, text) => {
    setAnswers((prev) => ({ ...prev, [i]: { ...prev[i], voice: text } }))
  }

  const setTyped = (i, text) => {
    setAnswers((prev) => ({ ...prev, [i]: { ...prev[i], typed: text } }))
  }

  const readAloud = async (i, text) => {
    setTtsLoading(i)
    try {
      const res = await api.post('/audio/speak', { text }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      new Audio(url).play()
    } catch {
      // silent fail
    } finally {
      setTtsLoading(null)
    }
  }

  const allAnswered = questions.every((_, i) => {
    const a = answers[i]
    return (a?.voice || a?.typed || '').trim()
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Answer a few questions</h2>
        <p className="text-sm text-slate-500">Type your answer or click the mic to speak.</p>
      </div>

      {questions.map((question, i) => {
        const voice  = answers[i]?.voice || ''
        const typed  = answers[i]?.typed || ''
        const answer = voice || typed

        return (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                <span className="text-brand-600 font-semibold mr-2">Q{i + 1}.</span>
                {question}
              </p>
              <button
                onClick={() => readAloud(i, question)}
                disabled={ttsLoading === i}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                title="Read question aloud"
              >
                {ttsLoading === i
                  ? <Loader size={16} className="animate-spin" />
                  : <Volume2 size={16} />
                }
              </button>
            </div>

            {/* Answer row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Type your answer..."
                value={typed}
                onChange={(e) => setTyped(i, e.target.value)}
              />
              <AudioRecorder onTranscription={(text) => setVoice(i, text)} />
            </div>

            {/* Voice transcription confirmation */}
            {voice && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-green-600 text-xs font-semibold mt-0.5">🎙 Voice:</span>
                <span className="text-green-800 text-xs">{voice}</span>
              </div>
            )}
          </div>
        )
      })}

      <button
        className="btn-primary"
        onClick={onNext}
        disabled={loading}
      >
        {loading ? 'Generating JD...' : 'Generate Job Description →'}
      </button>
    </div>
  )
}

/* ── Step 3 ─────────────────────────────────────────── */
function Step3({ jd, onSave, savedJobId, loading }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Review & Save</h2>
        <p className="text-sm text-slate-500">Review the generated JD and save it to the database.</p>
      </div>

      {/* JD Preview */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{jd.title}</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 text-brand-700">
            {jd.experience_level}
          </span>
        </div>

        <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
          {jd.description}
        </p>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {jd.required_skills?.map((skill) => (
              <span key={skill} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {savedJobId ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Job saved successfully!</p>
            <p className="text-xs text-green-700">Use <strong>Job ID: {savedJobId}</strong> in Resume Matcher.</p>
          </div>
        </div>
      ) : (
        <button className="btn-primary" onClick={onSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save JD to Database'}
        </button>
      )}
    </div>
  )
}

/* ── Direct Upload Form ──────────────────────────────── */
const EXPERIENCE_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead']

function DirectUploadForm() {
  const [form, setForm]         = useState({ title: '', description: '', skills: '', experience_level: 'Mid-Level' })
  const [savedJobId, setSavedId] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const isValid = form.title.trim() && form.description.trim() && form.skills.trim()

  const handleSave = async () => {
    setError('')
    setLoading(true)
    try {
      const required_skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await api.post('/jobs/create', {
        title: form.title.trim(),
        description: form.description.trim(),
        required_skills,
        experience_level: form.experience_level,
      })
      setSavedId(res.data.id)
    } catch {
      setError('Failed to save JD. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  if (savedJobId) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-4">
          <CheckCircle size={22} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Job saved successfully!</p>
            <p className="text-xs text-green-700 mt-0.5">Use <strong>Job ID: {savedJobId}</strong> in Resume Matcher.</p>
          </div>
        </div>
        <button
          className="btn-secondary mt-4 text-sm"
          onClick={() => { setForm({ title: '', description: '', skills: '', experience_level: 'Mid-Level' }); setSavedId(null) }}
        >
          Upload Another JD
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload Job Description</h2>
        <p className="text-sm text-slate-500">Fill in the JD details directly and save to database.</p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="input w-full"
            placeholder="e.g. Senior React Developer"
            value={form.title}
            onChange={set('title')}
          />
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level <span className="text-red-500">*</span></label>
          <select className="input w-full" value={form.experience_level} onChange={set('experience_level')}>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job Description <span className="text-red-500">*</span></label>
          <textarea
            className="input resize-none h-40 w-full"
            placeholder="Paste or write the full job description here..."
            value={form.description}
            onChange={set('description')}
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="input w-full"
            placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
            value={form.skills}
            onChange={set('skills')}
          />
          <p className="text-xs text-slate-400 mt-1">Separate skills with commas.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary" onClick={handleSave} disabled={!isValid || loading}>
        {loading ? 'Saving...' : 'Save to Database'}
      </button>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────── */
export default function JDGenerator() {
  const [mode, setMode]           = useState('ai')   // 'ai' | 'direct'
  const [step, setStep]           = useState(1)
  const [intent, setIntent]       = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]     = useState({})
  const [generatedJD, setJD]      = useState(null)
  const [savedJobId, setSavedId]  = useState(null)
  const [loading, setLoading]     = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setStep(1)
    setIntent('')
    setQuestions([])
    setAnswers({})
    setJD(null)
    setSavedId(null)
  }

  const getQuestions = async () => {
    setLoading(true)
    try {
      const res = await api.post('/jobs/questions', { intent })
      setQuestions(res.data.questions || [])
      setAnswers({})
      setStep(2)
    } catch {
      alert('Failed to generate questions. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const generateJD = async () => {
    setLoading(true)
    try {
      const filled = {}
      questions.forEach((q, i) => {
        const a = answers[i]
        const answer = (a?.voice || a?.typed || '').trim()
        if (answer) filled[q] = answer
      })
      const res = await api.post('/jobs/generate', { intent, answers: filled })
      setJD(res.data)
      setStep(3)
    } catch {
      alert('Failed to generate JD.')
    } finally {
      setLoading(false)
    }
  }

  const saveJD = async () => {
    setLoading(true)
    try {
      const res = await api.post('/jobs/create', generatedJD)
      setSavedId(res.data.id)
    } catch {
      alert('Failed to save JD.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">JD Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Create tailored job descriptions with AI assistance</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => switchMode('ai')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            mode === 'ai'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
          )}
        >
          <Sparkles size={15} />
          AI Generate
        </button>
        <button
          onClick={() => switchMode('direct')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            mode === 'direct'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
          )}
        >
          <Upload size={15} />
          Direct Upload
        </button>
      </div>

      {mode === 'direct' ? (
        <DirectUploadForm />
      ) : (
        <>
          <StepIndicator current={step} />

          {step === 1 && (
            <Step1 intent={intent} setIntent={setIntent} onNext={getQuestions} loading={loading} />
          )}
          {step === 2 && (
            <Step2 questions={questions} answers={answers} setAnswers={setAnswers} onNext={generateJD} loading={loading} />
          )}
          {step === 3 && (
            <Step3 jd={generatedJD} onSave={saveJD} savedJobId={savedJobId} loading={loading} />
          )}
        </>
      )}
    </div>
  )
}
