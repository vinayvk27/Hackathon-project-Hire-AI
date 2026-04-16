import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, Clock, CheckCircle } from 'lucide-react'
import api from '../api/client'

function MCQQuestion({ question, answer, onChange }) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full mt-0.5">MCQ</span>
        <p className="text-sm font-medium text-slate-800">{question.question}</p>
      </div>
      <div className="space-y-2 pl-2">
        {question.options?.map((option, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              answer === option
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              value={option}
              checked={answer === option}
              onChange={() => onChange(option)}
              className="accent-brand-600"
            />
            <span className="text-sm text-slate-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ShortAnswerQuestion({ question, answer, onChange }) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mt-0.5">Short</span>
        <p className="text-sm font-medium text-slate-800">{question.question}</p>
      </div>
      <textarea
        className="input resize-none h-28 text-sm"
        placeholder="Type your answer here..."
        value={answer || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function Assessment() {
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const navigate = useNavigate()

  const token = localStorage.getItem('candidate_token')
  const name  = localStorage.getItem('candidate_name')

  useEffect(() => {
    if (!token) { navigate('/candidate-login'); return }
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await api.get('/assessment/start', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setQuestions(res.data.questions || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assessment.')
    } finally {
      setLoading(false)
    }
  }

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const answeredCount = Object.values(answers).filter((a) => a?.trim()).length

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim())
    if (unanswered.length > 0) {
      if (!window.confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) return
    }

    setSubmitting(true)
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        question:    q.question,
        answer:      answers[q.id] || '',
      }))
      const res = await api.post(
        '/assessment/submit',
        { answers: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      localStorage.setItem('assessment_result', JSON.stringify(res.data))
      navigate('/assessment/result')
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader size={28} className="animate-spin text-brand-600" />
        <p className="text-slate-600 text-sm">Generating your personalised assessment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="card p-8 max-w-md text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <a href="/candidate-login" className="text-sm text-brand-600 hover:underline">Back to login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-slate-900">Technical Assessment</h1>
          <p className="text-xs text-slate-500">Welcome, {name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{answeredCount}</span>/{questions.length} answered
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center gap-2"
          >
            {submitting ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Clock size={15} />
          Answer all questions carefully. Your answers are evaluated on logic and depth.
        </div>

        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Question {i + 1}
              <span className="ml-2 text-slate-300">·</span>
              <span className="ml-2 capitalize">{q.difficulty || ''}</span>
            </p>
            {q.type === 'mcq' ? (
              <MCQQuestion
                question={q}
                answer={answers[q.id] || ''}
                onChange={(val) => setAnswer(q.id, val)}
              />
            ) : (
              <ShortAnswerQuestion
                question={q}
                answer={answers[q.id] || ''}
                onChange={(val) => setAnswer(q.id, val)}
              />
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full py-3 mt-4"
        >
          {submitting ? 'Evaluating your answers...' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  )
}
