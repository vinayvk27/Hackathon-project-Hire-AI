import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, LayoutDashboard } from 'lucide-react'

export default function AssessmentResult() {
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('assessment_result')
    if (!stored) { navigate('/candidate-login'); return }
    setResult(JSON.parse(stored))
    // Backend already set status = "Assessed" on submit; sync localStorage so
    // Stage 3 (Technical Round) is unlocked when the candidate lands on the dashboard.
    localStorage.setItem('candidate_status', 'Assessed')
  }, [])

  if (!result) return null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">

        {/* Submission confirmation */}
        <div className="card p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Assessment Submitted Successfully</h1>
          <p className="text-slate-500 leading-relaxed">
            Our team is evaluating your responses, and your dashboard will be updated shortly.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-colors text-base"
        >
          <LayoutDashboard size={20} />
          Return to Dashboard
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
