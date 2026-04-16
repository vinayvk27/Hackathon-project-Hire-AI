import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, AlertCircle, Trophy, Video } from 'lucide-react'

export default function AssessmentResult() {
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('assessment_result')
    if (!stored) { navigate('/candidate-login'); return }
    setResult(JSON.parse(stored))
  }, [])

  if (!result) return null

  const score = result.technical_score ?? 0
  const { color, label, Icon } =
    score >= 75 ? { color: 'text-green-600',  label: 'Excellent',    Icon: Trophy        } :
    score >= 55 ? { color: 'text-yellow-600', label: 'Good',         Icon: CheckCircle   } :
    score >= 40 ? { color: 'text-orange-500', label: 'Needs Work',   Icon: AlertCircle   } :
                  { color: 'text-red-600',    label: 'Below Bar',    Icon: XCircle       }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">

        {/* Score card */}
        <div className="card p-8 text-center space-y-3">
          <Icon size={40} className={`mx-auto ${color}`} />
          <h1 className="text-3xl font-bold text-slate-900">{score}<span className="text-lg font-normal text-slate-400">/100</span></h1>
          <p className={`text-lg font-semibold ${color}`}>{label}</p>
          <p className="text-sm text-slate-500">Your technical assessment is complete.</p>
        </div>

        {/* Reasoning */}
        <div className="card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Evaluator Feedback</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{result.reasoning_summary}</p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-sm text-slate-500">
            Your results have been saved. Proceed to the AI video interview to continue.
          </p>
        </div>

        <button
          onClick={() => navigate('/interview')}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-colors text-base"
        >
          <Video size={20} />
          Start AI Video Interview
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('candidate_token')
            localStorage.removeItem('candidate_id')
            localStorage.removeItem('candidate_name')
            localStorage.removeItem('assessment_result')
            navigate('/candidate-login')
          }}
          className="btn-secondary w-full"
        >
          Exit Portal
        </button>
      </div>
    </div>
  )
}
