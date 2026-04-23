import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login            from './pages/Login'
import JDGenerator      from './pages/JDGenerator'
import ResumeMatcher    from './pages/ResumeMatcher'
import Candidates       from './pages/Candidates'
import CandidateLogin      from './pages/CandidateLogin'
import CandidateDashboard  from './pages/CandidateDashboard'
import Assessment          from './pages/Assessment'
import AssessmentResult from './pages/AssessmentResult'
import VideoInterview   from './pages/VideoInterview'
import Layout           from './components/Layout'

const PrivateRoute = ({ children }) => {
  const auth = localStorage.getItem('hire_ai_auth')
  return auth ? children : <Navigate to="/login" replace />
}

// Statuses that are allowed to access the interview route
const INTERVIEW_STATUSES = ['Shortlisted', 'Assessed', 'Tech_Done']

const CandidateRoute = ({ children, allowedStatuses }) => {
  const token  = localStorage.getItem('candidate_token')
  const status = localStorage.getItem('candidate_status')
  if (!token) return <Navigate to="/candidate-login" replace />
  if (allowedStatuses && !allowedStatuses.includes(status)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HR Portal */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/jd" replace />} />
          <Route path="jd"         element={<JDGenerator />} />
          <Route path="match"      element={<ResumeMatcher />} />
          <Route path="candidates" element={<Candidates />} />
        </Route>

        {/* Candidate Portal */}
        <Route path="/candidate-login"  element={<CandidateLogin />} />
        <Route path="/dashboard"        element={<CandidateRoute><CandidateDashboard /></CandidateRoute>} />
        <Route path="/assessment"       element={<CandidateRoute><Assessment /></CandidateRoute>} />
        <Route path="/assessment/result" element={<CandidateRoute><AssessmentResult /></CandidateRoute>} />
        <Route path="/interview"        element={<CandidateRoute allowedStatuses={INTERVIEW_STATUSES}><VideoInterview /></CandidateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
