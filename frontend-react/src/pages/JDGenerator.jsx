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
        const done   = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  done   && 'bg-green-500 text-white',
                  active && 'bg-sky-600 text-white shadow-md shadow-sky-500/30',
                  !done && !active && 'bg-sky-100 text-sky-400'
                )}
              >
                {done ? <CheckCircle size={16} /> : idx}
              </div>
              <span
                className={clsx(
                  'text-sm font-medium',
                  active ? 'text-sky-800 font-semibold' : 'text-sky-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={16} className="text-sky-300 mx-3" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Shared input class ─────────────────────────────────── */
const inputCls =
  'w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-sm text-sky-950 placeholder-sky-300/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all'

const labelCls = 'block text-sky-800 text-xs font-bold ml-1 mb-1'

/* ── Step 1 ─────────────────────────────────────────── */
function Step1({ intent, setIntent, onNext, loading }) {
  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-extrabold text-sky-950 tracking-tight mb-1">
        What role do you need?
      </h2>
      <p className="text-sm text-sky-700/70 font-medium mb-4">
        Describe it in one line. We'll ask the right follow-up questions.
      </p>
      <textarea
        className={clsx(inputCls, 'resize-none h-24')}
        placeholder="e.g. Senior React developer with 3+ years for a fintech product"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
      />
      <button
        className="mt-4 flex items-center gap-2 bg-gradient-to-r from-sky-500 to-green-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        onClick={onNext}
        disabled={!intent.trim() || loading}
      >
        {loading ? (
          <>
            <Loader size={15} className="animate-spin" />
            Generating questions...
          </>
        ) : (
          <>
            Get Questions
            <ChevronRight size={15} />
          </>
        )}
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
        <h2 className="text-lg font-extrabold text-sky-950 tracking-tight mb-1">
          Answer a few questions
        </h2>
        <p className="text-sm text-sky-700/70 font-medium">
          Type your answer or click the mic to speak.
        </p>
      </div>

      {questions.map((question, i) => {
        const voice  = answers[i]?.voice || ''
        const typed  = answers[i]?.typed || ''

        return (
          <div
            key={i}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-sky-900">
                <span className="text-sky-600 font-bold mr-2">Q{i + 1}.</span>
                {question}
              </p>
              <button
                onClick={() => readAloud(i, question)}
                disabled={ttsLoading === i}
                className="p-1.5 rounded-lg text-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-colors shrink-0"
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
                className={clsx(inputCls, 'flex-1')}
                placeholder="Type your answer..."
                value={typed}
                onChange={(e) => setTyped(i, e.target.value)}
              />
              <AudioRecorder onTranscription={(text) => setVoice(i, text)} />
            </div>

            {/* Voice transcription confirmation */}
            {voice && (
              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                <span className="text-sky-600 text-xs font-semibold mt-0.5">🎙 Voice:</span>
                <span className="text-sky-800 text-xs">{voice}</span>
              </div>
            )}
          </div>
        )
      })}

      <button
        className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-green-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        onClick={onNext}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader size={15} className="animate-spin" />
            Generating JD...
          </>
        ) : (
          <>
            Generate Job Description
            <ChevronRight size={15} />
          </>
        )}
      </button>
    </div>
  )
}

/* ── Step 3 ─────────────────────────────────────────── */
function Step3({ jd, onSave, submitted, loading }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-sky-950 tracking-tight mb-1">
          Review & Submit
        </h2>
        <p className="text-sm text-sky-700/70 font-medium">
          Review the generated JD and submit it to the AI pipeline.
        </p>
      </div>

      {/* JD Preview */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-sky-950 tracking-tight">{jd.title}</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
            {jd.experience_level}
          </span>
        </div>

        <p className="text-sm text-sky-800/80 whitespace-pre-line leading-relaxed">
          {jd.description}
        </p>

        <div>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {jd.required_skills?.map((skill) => (
              <span
                key={skill}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">
            Job Description submitted to Talent Management AI Pipeline for review.
          </p>
        </div>
      ) : (
        <button
          className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-green-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          onClick={onSave}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={15} className="animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit to AI Pipeline'
          )}
        </button>
      )}
    </div>
  )
}

/* ── Direct Upload Form ──────────────────────────────── */
const EXPERIENCE_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead']

function DirectUploadForm() {
  const [form, setForm]         = useState({ title: '', description: '', skills: '', experience_level: 'Mid-Level' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const isValid = form.title.trim() && form.description.trim() && form.skills.trim()

  const handleSave = async () => {
    setError('')
    setLoading(true)
    try {
      const sessionUser = JSON.parse(localStorage.getItem('user') || '{}')
      await fetch('http://172.20.30.214:5678/webhook-test/request-hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: sessionUser.name,
          department: sessionUser.department,
          job_title: form.title.trim(),
          job_description: form.description.trim(),
        }),
      })
      setSubmitted(true)
    } catch {
      setError('Failed to submit JD. Is n8n running on port 5678?')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-4">
          <CheckCircle size={22} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">
            Job Description submitted to Talent Management AI Pipeline for review.
          </p>
        </div>
        <button
          className="mt-4 text-sm font-bold text-sky-600 border border-sky-200 hover:border-sky-400 hover:bg-sky-50 rounded-xl px-5 py-2.5 transition-all"
          onClick={() => { setForm({ title: '', description: '', skills: '', experience_level: 'Mid-Level' }); setSubmitted(false) }}
        >
          Submit Another JD
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-sky-950 tracking-tight mb-1">
          Upload Job Description
        </h2>
        <p className="text-sm text-sky-700/70 font-medium">
          Fill in the JD details directly and save to database.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-sky-200/80 shadow-lg shadow-sky-900/10 p-5 space-y-4">
        {/* Title */}
        <div>
          <label className={labelCls}>
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. Senior React Developer"
            value={form.title}
            onChange={set('title')}
          />
        </div>

        {/* Experience Level */}
        <div>
          <label className={labelCls}>
            Experience Level <span className="text-red-500">*</span>
          </label>
          <select className={inputCls} value={form.experience_level} onChange={set('experience_level')}>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className={clsx(inputCls, 'resize-none h-40')}
            placeholder="Paste or write the full job description here..."
            value={form.description}
            onChange={set('description')}
          />
        </div>

        {/* Skills */}
        <div>
          <label className={labelCls}>
            Required Skills <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
            value={form.skills}
            onChange={set('skills')}
          />
          <p className="text-xs text-sky-400 mt-1 ml-1">Separate skills with commas.</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-green-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        onClick={handleSave}
        disabled={!isValid || loading}
      >
        {loading ? (
          <>
            <Loader size={15} className="animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit to AI Pipeline'
        )}
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
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setStep(1)
    setIntent('')
    setQuestions([])
    setAnswers({})
    setJD(null)
    setSubmitted(false)
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
      const sessionUser = JSON.parse(localStorage.getItem('user') || '{}')
      await fetch('http://172.20.30.214:5678/webhook-test/request-hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: sessionUser.name,
          department: sessionUser.department,
          job_title: generatedJD.title,
          job_description: generatedJD.description,
        }),
      })
      setSubmitted(true)
    } catch {
      alert('Failed to submit JD. Is n8n running on port 5678?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 relative font-sans">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-green-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-sky-950 tracking-tight">JD Generator</h1>
          <p className="text-sky-700/70 font-medium text-sm mt-1">
            Create tailored job descriptions with AI assistance
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => switchMode('ai')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all transform hover:-translate-y-0.5',
              mode === 'ai'
                ? 'bg-gradient-to-r from-sky-500 to-green-500 text-white border-transparent shadow-md shadow-sky-500/25'
                : 'text-sky-600 border-sky-200 hover:border-sky-400 hover:bg-sky-50'
            )}
          >
            <Sparkles size={15} />
            AI Generate
          </button>
          <button
            onClick={() => switchMode('direct')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all transform hover:-translate-y-0.5',
              mode === 'direct'
                ? 'bg-gradient-to-r from-sky-500 to-green-500 text-white border-transparent shadow-md shadow-sky-500/25'
                : 'text-sky-600 border-sky-200 hover:border-sky-400 hover:bg-sky-50'
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
              <Step3 jd={generatedJD} onSave={saveJD} submitted={submitted} loading={loading} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
