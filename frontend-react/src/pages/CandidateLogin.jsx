import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck } from 'lucide-react'
import api from '../api/client'

export default function CandidateLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/assessment/login', { email, password })
      const { access_token, candidate_id, name, status } = res.data

      const ALLOWED = ['Shortlisted', 'Screening_Done', 'Assessed', 'Tech_Done']
      if (!ALLOWED.includes(status)) {
        setError(`Your application status is "${status}". Access is not available at this stage.`)
        return
      }

      localStorage.setItem('candidate_token', access_token)
      localStorage.setItem('candidate_id', candidate_id)
      localStorage.setItem('candidate_name', name)
      localStorage.setItem('candidate_status', status)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-xl mb-3">
            <UserCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Candidate Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to take your assessment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            HR Login?{' '}
            <a href="/login" className="text-brand-600 hover:underline">Click here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
