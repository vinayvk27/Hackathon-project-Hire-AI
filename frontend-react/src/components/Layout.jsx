import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })
  const setPersisted = (value) => {
    setState(value)
    localStorage.setItem(key, JSON.stringify(value))
  }
  return [state, setPersisted]
}

export default function Layout() {
  // ResumeMatcher — persist across tab switches
  const [matcherJobId,    setMatcherJobId]    = useState('')
  const [matcherResults,  setMatcherResults]  = useState(null)
  const [matcherUploaded, setMatcherUploaded] = useState(false)

  // Persisted state
  const [selectedCandidates, setSelectedCandidates] = usePersistedState('selectedCandidates', [])
  const [credentials,        setCredentials]        = usePersistedState('credentials', {})
  const [jobId,              setJobId]              = usePersistedState('jobId', '')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet context={{
          matcherJobId,    setMatcherJobId,
          matcherResults,  setMatcherResults,
          matcherUploaded, setMatcherUploaded,
          selectedCandidates, setSelectedCandidates,
          credentials,        setCredentials,
          jobId,              setJobId,
        }} />
      </main>
    </div>
  )
}
